import fetch, { type Response } from 'node-fetch';
import { VM } from 'vm2';
import AWS from 'aws-sdk';
import { Block } from '@near-lake/primitives';

import Provisioner from '../provisioner';

interface Dependencies {
  fetch: typeof fetch
  s3: AWS.S3
  provisioner: Provisioner
};

interface Context {
  graphql: (operation: string, variables?: Record<string, any>) => Promise<any>
  set: (key: string, value: any) => Promise<any>
  log: (...log: any[]) => Promise<void>
  fetchFromSocialApi: (path: string, options?: any) => Promise<any>
}

interface IndexerFunction {
  account_id: string
  function_name: string
  provisioned?: boolean
  schema: string
  code: string
  updated?: boolean
}

export default class Indexer {
  DEFAULT_HASURA_ROLE;

  private readonly deps: Dependencies;

  constructor (
    private readonly network: string,
    deps?: Partial<Dependencies>
  ) {
    this.DEFAULT_HASURA_ROLE = 'append';
    this.network = network;
    this.deps = {
      fetch,
      s3: new AWS.S3(),
      provisioner: new Provisioner(),
      ...deps,
    };
  }

  async runFunctions (
    blockHeight: number,
    functions: Record<string, IndexerFunction>,
    isHistorical: boolean,
    options: { provision?: boolean } = { provision: false }
  ): Promise<string[]> {
    const blockWithHelpers = Block.fromStreamerMessage(await this.fetchStreamerMessage(blockHeight));

    const lag = Date.now() - Math.floor(Number(blockWithHelpers.header().timestampNanosec) / 1000000);

    const simultaneousPromises: Array<Promise<any>> = [];
    const allMutations: string[] = [];

    for (const functionName in functions) {
      try {
        const indexerFunction = functions[functionName];
        if (!isHistorical && !indexerFunction.updated) {
          // check status and skip if STOPPED
          if (await this.getStatus(functionName) === 'STOPPED') {
            console.log(`Skipping function ${functionName} because it's stopped and the indexer function hasn't been updated`);
            continue;
          }
        }

        const runningMessage = `Running function ${functionName}` + (isHistorical ? ' historical backfill' : `, lag is: ${lag?.toString()}ms from block timestamp`);
        console.log(runningMessage); // Print the running message to the console (Lambda logs)

        simultaneousPromises.push(this.writeLog(functionName, blockHeight, runningMessage));

        const hasuraRoleName = functionName.split('/')[0].replace(/[.-]/g, '_');
        const functionNameWithoutAccount = functionName.split('/')[1].replace(/[.-]/g, '_');

        if (options.provision && !indexerFunction.provisioned) {
          try {
            if (!await this.deps.provisioner.isUserApiProvisioned(indexerFunction.account_id, indexerFunction.function_name)) {
              await this.setStatus(functionName, blockHeight, 'PROVISIONING');
              simultaneousPromises.push(this.writeLog(functionName, blockHeight, 'Provisioning endpoint: starting'));

              await this.deps.provisioner.provisionUserApi(indexerFunction.account_id, indexerFunction.function_name, indexerFunction.schema);

              simultaneousPromises.push(this.writeLog(functionName, blockHeight, 'Provisioning endpoint: successful'));
            }
          } catch (e) {
            const error = e as Error;
            simultaneousPromises.push(this.writeLog(functionName, blockHeight, 'Provisioning endpoint: failure', error.message));
            throw error;
          }
        }

        await this.setStatus(functionName, blockHeight, 'RUNNING');

        const vm = new VM({ timeout: 3000, allowAsync: true });
        const context = this.buildContext(functionName, functionNameWithoutAccount, blockHeight, hasuraRoleName);

        vm.freeze(blockWithHelpers, 'block');
        vm.freeze(context, 'context');
        vm.freeze(context, 'console'); // provide console.log via context.log

        const modifiedFunction = this.transformIndexerFunction(indexerFunction.code);
        try {
          await vm.run(modifiedFunction);
        } catch (e) {
          const error = e as Error;
          // NOTE: logging the exception would likely leak some information about the index runner.
          // For now, we just log the message. In the future we could sanitize the stack trace
          // and give the correct line number offsets within the indexer function
          console.error(`${functionName}: Error running IndexerFunction on block ${blockHeight}: ${error.message}`);
          await this.writeLog(functionName, blockHeight, 'Error running IndexerFunction', error.message);
          throw e;
        }

        simultaneousPromises.push(this.writeFunctionState(functionName, blockHeight, isHistorical));
      } catch (e) {
        console.error(`${functionName}: Failed to run function`, e);
        await this.setStatus(functionName, blockHeight, 'STOPPED');
        throw e;
      } finally {
        await Promise.all(simultaneousPromises);
      }
    }
    return allMutations;
  }

  // pad with 0s to 12 digits
  normalizeBlockHeight (blockHeight: number): string {
    return blockHeight.toString().padStart(12, '0');
  }

  async fetchStreamerMessage (blockHeight: number): Promise<{ block: any, shards: any[] }> {
    const blockPromise = this.fetchBlockPromise(blockHeight);
    const shardsPromises = await this.fetchShardsPromises(blockHeight, 4);

    const results = await Promise.all([blockPromise, ...shardsPromises]);
    const block = results.shift();
    const shards = results;
    return {
      block,
      shards,
    };
  }

  async fetchShardsPromises (blockHeight: number, numberOfShards: number): Promise<Array<Promise<any>>> {
    return ([...Array(numberOfShards).keys()].map(async (shardId) =>
      await this.fetchShardPromise(blockHeight, shardId)
    ));
  }

  async fetchShardPromise (blockHeight: number, shardId: number): Promise<any> {
    const params = {
      Bucket: `near-lake-data-${this.network}`,
      Key: `${this.normalizeBlockHeight(blockHeight)}/shard_${shardId}.json`,
    };
    return await this.deps.s3.getObject(params).promise().then((response) => {
      return JSON.parse(response.Body?.toString() ?? '{}', (_key, value) => this.renameUnderscoreFieldsToCamelCase(value));
    });
  }

  async fetchBlockPromise (blockHeight: number): Promise<any> {
    const file = 'block.json';
    const folder = this.normalizeBlockHeight(blockHeight);
    const params = {
      Bucket: 'near-lake-data-' + this.network,
      Key: `${folder}/${file}`,
    };
    return await this.deps.s3.getObject(params).promise().then((response) => {
      const block = JSON.parse(response.Body?.toString() ?? '{}', (_key, value) => this.renameUnderscoreFieldsToCamelCase(value));
      return block;
    });
  }

  enableAwaitTransform (indexerFunction: string): string {
    return `
            async function f(){
                ${indexerFunction}
            };
            f();
    `;
  }

  transformIndexerFunction (indexerFunction: string): string {
    return [
      this.enableAwaitTransform,
    ].reduce((acc, val) => val(acc), indexerFunction);
  }

  buildContext (functionName: string, functionNameWithoutAccount: string, blockHeight: number, hasuraRoleName: string): Context {
    return {
      graphql: async (operation, variables) => {
        console.log(`${functionName}: Running context graphql`, operation);
        return await this.runGraphQLQuery(operation, variables, functionName, blockHeight, hasuraRoleName);
      },
      set: async (key, value) => {
        const mutation =
                    `mutation SetKeyValue($function_name: String!, $key: String!, $value: String!) {
                        insert_${hasuraRoleName}_${functionNameWithoutAccount}_indexer_storage_one(object: {function_name: $function_name, key_name: $key, value: $value} on_conflict: {constraint: indexer_storage_pkey, update_columns: value}) {key_name}
                     }`;
        const variables = {
          function_name: functionName,
          key,
          value: value ? JSON.stringify(value) : null
        };
        console.log(`${functionName}: Running set:`, mutation, variables);
        return await this.runGraphQLQuery(mutation, variables, functionName, blockHeight, hasuraRoleName);
      },
      log: async (...log) => {
        return await this.writeLog(functionName, blockHeight, ...log);
      },
      fetchFromSocialApi: async (path, options) => {
        return await this.deps.fetch(`https://api.near.social${path}`, options);
      }
    };
  }
  async getStatus(functionName: string) {
    return await this.runGraphQLQuery(
        `
                query GetStatus($function_name: String) {
                  indexer_state(where: {function_name: {_eq: $function_name}}) {
                    status
                  }
                }
            `,
        {
          function_name: functionName,
        },
        functionName,
        0,
        this.DEFAULT_HASURA_ROLE
    ).then((result) => {
      return result?.indexer_state?.[0]?.status;
    });
  }
  async setStatus (functionName: string, blockHeight: number, status: string): Promise<any> {
    return await this.runGraphQLQuery(
            `
                mutation SetStatus($function_name: String, $status: String) {
                  insert_indexer_state_one(object: {function_name: $function_name, status: $status, current_block_height: 0 }, on_conflict: { constraint: indexer_state_pkey, update_columns: status }) {
                    function_name
                    status
                  }
                }
            `,
            {
              function_name: functionName,
              status,
            },
            functionName,
            blockHeight,
            this.DEFAULT_HASURA_ROLE
    );
  }

  async writeLog (functionName: string, blockHeight: number, ...message: any[]): Promise<any> {
    const parsedMessage: string = message
      .map(m => typeof m === 'object' ? JSON.stringify(m) : m)
      .join(':');

    const mutation =
            `mutation writeLog($function_name: String!, $block_height: numeric!, $message: String!){
                insert_indexer_log_entries_one(object: {function_name: $function_name, block_height: $block_height, message: $message}) {id}
             }`;

    return await this.runGraphQLQuery(mutation, { function_name: functionName, block_height: blockHeight, message: parsedMessage },
      functionName, blockHeight, this.DEFAULT_HASURA_ROLE)
      .then((result: any) => {
        return result?.insert_indexer_log_entries_one?.id;
      })
      .catch((e: any) => {
        console.error(`${functionName}: Error writing log`, e);
      });
  }

  async writeFunctionState (functionName: string, blockHeight: number, isHistorical: boolean): Promise<any> {
    const realTimeMutation: string =
            `mutation WriteBlock($function_name: String!, $block_height: numeric!) {
                  insert_indexer_state(
                    objects: {current_block_height: $block_height, function_name: $function_name}
                    on_conflict: {constraint: indexer_state_pkey, update_columns: current_block_height}
                  ) {
                    returning {
                      current_block_height
                      function_name
                    }
                  }
                }`;
    const historicalMutation: string = `
            mutation WriteBlock($function_name: String!, $block_height: numeric!) {
              insert_indexer_state(
                objects: {current_historical_block_height: $block_height, current_block_height: 0, function_name: $function_name}
                on_conflict: {constraint: indexer_state_pkey, update_columns: current_historical_block_height}
              ) {
                returning {
                  current_block_height
                  current_historical_block_height
                  function_name
                }
              }
            }
        `;
    const variables: any = {
      function_name: functionName,
      block_height: blockHeight,
    };
    return await this.runGraphQLQuery(isHistorical ? historicalMutation : realTimeMutation, variables, functionName, blockHeight, this.DEFAULT_HASURA_ROLE)
      .catch((e: any) => {
        console.error(`${functionName}: Error writing function state`, e);
      });
  }

  async runGraphQLQuery (operation: string, variables: any, functionName: string, blockHeight: number, hasuraRoleName: string | null, logError: boolean = true): Promise<any> {
    const response: Response = await this.deps.fetch(`${process.env.HASURA_ENDPOINT}/v1/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hasura-Use-Backend-Only-Permissions': 'true',
        ...(hasuraRoleName && {
          'X-Hasura-Role': hasuraRoleName,
          'X-Hasura-Admin-Secret': process.env.HASURA_ADMIN_SECRET
        }),
      },
      body: JSON.stringify({
        query: operation,
        ...(variables && { variables }),
      }),
    });

    const { data, errors } = await response.json();

    if (response.status !== 200 || errors) {
      if (logError) {
        console.log(`${functionName}: Error writing graphql `, errors); // temporary extra logging

        const message: string = errors ? errors.map((e: any) => e.message).join(', ') : `HTTP ${response.status} error writing with graphql to indexer storage`;
        const mutation: string =
                    `mutation writeLog($function_name: String!, $block_height: numeric!, $message: String!){
                    insert_indexer_log_entries_one(object: {function_name: $function_name, block_height: $block_height, message: $message}) {
                    id
                  }
                }`;
        try {
          await this.runGraphQLQuery(mutation, { function_name: functionName, block_height: blockHeight, message }, functionName, blockHeight, this.DEFAULT_HASURA_ROLE, false);
        } catch (e) {
          console.error(`${functionName}: Error writing log of graphql error`, e);
        }
      }
      throw new Error(`Failed to write graphql, http status: ${response.status}, errors: ${JSON.stringify(errors, null, 2)}`);
    }

    return data;
  }

  renameUnderscoreFieldsToCamelCase (value: Record<string, any>): Record<string, any> {
    if (typeof value === 'object' && !Array.isArray(value)) {
      // It's a non-null, non-array object, create a replacement with the keys initially-capped
      const newValue: any = {};
      for (const key in value) {
        const newKey: string = key
          .split('_')
          .map((word, i) => {
            if (i > 0) {
              return word.charAt(0).toUpperCase() + word.slice(1);
            }
            return word;
          })
          .join('');
        newValue[newKey] = value[key];
      }
      return newValue;
    }
    return value;
  }
}
