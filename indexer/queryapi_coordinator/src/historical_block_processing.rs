use crate::indexer_types::{IndexerFunction, IndexerQueueMessage};
use crate::opts::{Opts, Parser};
use crate::queue;
use crate::s3;
use anyhow::{bail, Context};
use aws_sdk_s3::Client as S3Client;
use aws_sdk_s3::Config;
use aws_sdk_sqs::Client;
use aws_types::SdkConfig;
use chrono::{DateTime, LocalResult, TimeZone, Utc};
use indexer_rule_type::indexer_rule::MatchingRule;
use indexer_rules_engine::types::indexer_rule_match::{ChainId, IndexerRuleMatchPayload};
use near_jsonrpc_client::JsonRpcClient;
use near_jsonrpc_primitives::types::blocks::RpcBlockRequest;
use near_lake_framework::near_indexer_primitives::types::{BlockHeight, BlockId, BlockReference};
use serde_json::from_str;
use tokio::task::JoinHandle;

pub const INDEXED_DATA_FILES_BUCKET: &str = "near-delta-lake";
pub const LAKE_BUCKET_PREFIX: &str = "near-lake-data-";
pub const INDEXED_ACTIONS_FILES_FOLDER: &str = "silver/accounts/action_receipt_actions/metadata";
pub const MAX_UNINDEXED_BLOCKS_TO_PROCESS: u64 = 7200; // two hours of blocks takes ~14 minutes.
pub const MAX_RPC_BLOCKS_TO_PROCESS: u8 = 20;

pub fn spawn_historical_message_thread(
    block_height: BlockHeight,
    new_indexer_function: &IndexerFunction,
    redis_connection_manager: &storage::ConnectionManager,
) -> Option<JoinHandle<i64>> {
    let redis_connection_manager = redis_connection_manager.clone();
    new_indexer_function.start_block_height.map(|_| {
        let new_indexer_function_copy = new_indexer_function.clone();
        tokio::spawn(async move {
            process_historical_messages_or_handle_error(
                block_height,
                new_indexer_function_copy,
                Opts::parse(),
                &redis_connection_manager,
            )
            .await
        })
    })
}

pub(crate) async fn process_historical_messages_or_handle_error(
    block_height: BlockHeight,
    indexer_function: IndexerFunction,
    opts: Opts,
    redis_connection_manager: &storage::ConnectionManager,
) -> i64 {
    match process_historical_messages(
        block_height,
        indexer_function,
        opts,
        redis_connection_manager,
    )
    .await
    {
        Ok(block_difference) => block_difference,
        Err(err) => {
            // todo: when Coordinator can send log messages to Runner, send this error to Runner
            tracing::error!(
                target: crate::INDEXER,
                "Error processing historical messages: {:?}",
                err
            );
            0
        }
    }
}
pub(crate) async fn process_historical_messages(
    block_height: BlockHeight,
    indexer_function: IndexerFunction,
    opts: Opts,
    redis_connection_manager: &storage::ConnectionManager,
) -> anyhow::Result<i64> {
    let start_block = indexer_function.start_block_height.unwrap();
    let block_difference: i64 = (block_height - start_block) as i64;
    match block_difference {
        i64::MIN..=-1 => {
            bail!("Skipping back fill, start_block_height is greater than current block height: {:?} {:?}",
                                     indexer_function.account_id,
                                     indexer_function.function_name);
        }
        0 => {
            bail!("Skipping back fill, start_block_height is equal to current block height: {:?} {:?}",
                                     indexer_function.account_id,
                                     indexer_function.function_name);
        }
        1..=i64::MAX => {
            tracing::info!(
                target: crate::INDEXER,
                "Back filling {block_difference} blocks from {start_block} to current block height {block_height}: {:?} {:?}",
                indexer_function.account_id,
                indexer_function.function_name
            );

            let chain_id = opts.chain_id().clone();
            let aws_region = opts.aws_queue_region.clone();
            let queue_client = queue::queue_client(aws_region, opts.queue_credentials());
            let queue_url = opts.start_from_block_queue_url.clone();
            let aws_config: &SdkConfig = &opts.lake_aws_sdk_config();

            let json_rpc_client = JsonRpcClient::connect(opts.rpc_url());
            let start_date =
                lookup_block_date_or_next_block_date(start_block, &json_rpc_client).await?;

            let mut indexer_function = indexer_function.clone();

            let last_indexed_block = last_indexed_block_from_metadata(aws_config).await?;
            let last_indexed_block = last_indexed_block;

            let mut blocks_from_index = filter_matching_blocks_from_index_files(
                start_block,
                &indexer_function,
                aws_config,
                start_date,
            )
            .await?;

            // Check for the case where an index file is written right after we get the last_indexed_block metadata
            let last_block_in_data = blocks_from_index.last().unwrap_or(&start_block);
            let last_indexed_block = if last_block_in_data > &last_indexed_block {
                *last_block_in_data
            } else {
                last_indexed_block
            };

            let mut blocks_between_indexed_and_current_block: Vec<BlockHeight> =
                filter_matching_unindexed_blocks_from_lake(
                    last_indexed_block,
                    block_height,
                    &indexer_function,
                    aws_config,
                    chain_id.clone(),
                )
                .await?;

            blocks_from_index.append(&mut blocks_between_indexed_and_current_block);

            let first_block_in_index = *blocks_from_index.first().unwrap_or(&start_block);

            if !blocks_from_index.is_empty() {
                storage::sadd(
                    redis_connection_manager,
                    storage::STREAMS_SET_KEY,
                    storage::generate_historical_stream_key(&indexer_function.get_full_name()),
                )
                .await?;
                storage::set(
                    redis_connection_manager,
                    storage::generate_historical_storage_key(&indexer_function.get_full_name()),
                    serde_json::to_string(&indexer_function)?,
                )
                .await?;
            }

            for current_block in blocks_from_index {
                storage::xadd(
                    redis_connection_manager,
                    storage::generate_historical_stream_key(&indexer_function.get_full_name()),
                    &[("block_height", current_block)],
                )
                .await?;

                send_execution_message(
                    block_height,
                    first_block_in_index,
                    chain_id.clone(),
                    &queue_client,
                    queue_url.clone(),
                    &mut indexer_function,
                    current_block,
                    None,
                )
                .await;
            }
        }
    }
    Ok(block_difference)
}

pub(crate) async fn last_indexed_block_from_metadata(
    aws_config: &SdkConfig,
) -> anyhow::Result<BlockHeight> {
    let key = format!("{}/{}", INDEXED_ACTIONS_FILES_FOLDER, "latest_block.json");
    let s3_config: Config = aws_sdk_s3::config::Builder::from(aws_config).build();
    let s3_client: S3Client = S3Client::from_conf(s3_config);
    let metadata = s3::fetch_text_file_from_s3(INDEXED_DATA_FILES_BUCKET, key, s3_client).await?;

    let metadata: serde_json::Value = serde_json::from_str(&metadata).unwrap();
    let last_indexed_block = metadata["last_indexed_block"].clone();
    let last_indexed_block = last_indexed_block
        .as_str()
        .context("No last_indexed_block found in latest_block.json")?;
    let last_indexed_block =
        from_str(last_indexed_block).context("last_indexed_block couldn't be converted to u64")?;
    tracing::info!(
        target: crate::INDEXER,
        "Last indexed block from latest_block.json: {:?}",
        last_indexed_block
    );
    Ok(last_indexed_block)
}

pub(crate) async fn filter_matching_blocks_from_index_files(
    start_block_height: BlockHeight,
    indexer_function: &IndexerFunction,
    aws_config: &SdkConfig,
    start_date: DateTime<Utc>,
) -> anyhow::Result<Vec<BlockHeight>> {
    let s3_bucket = INDEXED_DATA_FILES_BUCKET;

    let mut needs_dedupe_and_sort = false;
    let indexer_rule = &indexer_function.indexer_rule;

    let index_files_content = match &indexer_rule.matching_rule {
        MatchingRule::ActionAny {
            affected_account_id,
            ..
        } => {
            if affected_account_id.contains('*') || affected_account_id.contains(',') {
                needs_dedupe_and_sort = true;
            }
            s3::fetch_contract_index_files(
                aws_config,
                s3_bucket,
                INDEXED_ACTIONS_FILES_FOLDER,
                start_date,
                affected_account_id,
            )
            .await
        }
        MatchingRule::ActionFunctionCall { .. } => {
            bail!("ActionFunctionCall matching rule not yet supported for historical processing, function: {:?} {:?}", indexer_function.account_id, indexer_function.function_name);
        }
        MatchingRule::Event { .. } => {
            bail!("Event matching rule not yet supported for historical processing, function {:?} {:?}", indexer_function.account_id, indexer_function.function_name);
        }
    }?;

    tracing::info!(
        target: crate::INDEXER,
        "Found {file_count} index files for function {:?} {:?} with matching rule {indexer_rule:?}",
        indexer_function.account_id,
        indexer_function.function_name,
        file_count = index_files_content.len()
    );
    let mut blocks_to_process: Vec<BlockHeight> =
        parse_blocks_from_index_files(index_files_content, start_block_height);
    if needs_dedupe_and_sort {
        blocks_to_process.sort();
        blocks_to_process.dedup();
    }
    tracing::info!(
        target: crate::INDEXER,
        "Found {block_count} indexed blocks to process for function {:?} {:?}",
        indexer_function.account_id,
        indexer_function.function_name,
        block_count = blocks_to_process.len()
    );

    Ok(blocks_to_process)
}

fn parse_blocks_from_index_files(
    index_files_content: Vec<String>,
    start_block_height: u64,
) -> Vec<BlockHeight> {
    index_files_content
        .into_iter()
        .flat_map(|file_content| {
            if let Ok(file_json) = serde_json::from_str::<serde_json::Value>(&file_content) {
                if let Some(block_heights) = file_json["heights"].as_array() {
                    block_heights
                        .iter()
                        .map(|block_height| block_height.as_u64().unwrap())
                        .collect::<Vec<u64>>()
                        .into_iter()
                        .filter(|block_height| block_height >= &start_block_height)
                        .collect()
                } else {
                    tracing::error!(
                        target: crate::INDEXER,
                        "Unable to parse index file, no heights found: {:?}",
                        file_content
                    );
                    vec![]
                }
            } else {
                tracing::error!(
                    target: crate::INDEXER,
                    "Unable to parse index file: {:?}",
                    file_content
                );
                vec![]
            }
        })
        .collect::<Vec<u64>>()
}

async fn filter_matching_unindexed_blocks_from_lake(
    last_indexed_block: BlockHeight,
    ending_block_height: BlockHeight,
    indexer_function: &IndexerFunction,
    aws_config: &SdkConfig,
    chain_id: ChainId,
) -> anyhow::Result<Vec<u64>> {
    let s3_config: Config = aws_sdk_s3::config::Builder::from(aws_config).build();
    let s3_client: S3Client = S3Client::from_conf(s3_config);
    let lake_bucket = lake_bucket_for_chain(chain_id.clone());

    let indexer_rule = &indexer_function.indexer_rule;
    let count = ending_block_height - last_indexed_block;
    if count > MAX_UNINDEXED_BLOCKS_TO_PROCESS {
        bail!(
            "Too many unindexed blocks to filter: {count}. Last indexed block is {last_indexed_block} for function {:?} {:?}",
            indexer_function.account_id,
            indexer_function.function_name,
        );
    }
    tracing::info!(
        target: crate::INDEXER,
        "Filtering {count} unindexed blocks from lake: from block {last_indexed_block} to {ending_block_height} for function {:?} {:?}",
        indexer_function.account_id,
        indexer_function.function_name,
    );

    let mut blocks_to_process: Vec<u64> = vec![];
    for current_block in (last_indexed_block + 1)..ending_block_height {
        // fetch block file from S3
        let key = format!("{}/block.json", normalize_block_height(current_block));
        let block = s3::fetch_text_file_from_s3(&lake_bucket, key, s3_client.clone()).await?;
        let block_view = serde_json::from_slice::<
            near_lake_framework::near_indexer_primitives::views::BlockView,
        >(block.as_ref())
        .with_context(|| format!("Error parsing block {} from S3", current_block))?;

        let mut shards = vec![];
        for shard_id in 0..block_view.chunks.len() as u64 {
            let key = format!(
                "{}/shard_{}.json",
                normalize_block_height(current_block),
                shard_id
            );
            let shard = s3::fetch_text_file_from_s3(&lake_bucket, key, s3_client.clone()).await?;
            match serde_json::from_slice::<near_lake_framework::near_indexer_primitives::IndexerShard>(
                shard.as_ref(),
            ) {
                Ok(parsed_shard) => {
                    shards.push(parsed_shard);
                }
                Err(e) => {
                    bail!("Error parsing shard: {}", e.to_string());
                }
            }
        }

        let streamer_message = near_lake_framework::near_indexer_primitives::StreamerMessage {
            block: block_view,
            shards,
        };

        // filter block
        let matches = indexer_rules_engine::reduce_indexer_rule_matches_sync(
            indexer_rule,
            &streamer_message,
            chain_id.clone(),
        );
        if !matches.is_empty() {
            blocks_to_process.push(current_block);
        }
    }

    tracing::info!(
        target: crate::INDEXER,
        "Found {block_count} unindexed blocks to process for function {:?} {:?}",
        indexer_function.account_id,
        indexer_function.function_name,
        block_count = blocks_to_process.len()
    );
    Ok(blocks_to_process)
}

fn lake_bucket_for_chain(chain_id: ChainId) -> String {
    format!("{}{}", LAKE_BUCKET_PREFIX, chain_id)
}

fn normalize_block_height(block_height: BlockHeight) -> String {
    format!("{:0>12}", block_height)
}

async fn send_execution_message(
    block_height: BlockHeight,
    first_block: BlockHeight,
    chain_id: ChainId,
    queue_client: &Client,
    queue_url: String,
    indexer_function: &mut IndexerFunction,
    current_block: u64,
    payload: Option<IndexerRuleMatchPayload>,
) {
    // only request provisioning on the first block
    if current_block != first_block {
        indexer_function.provisioned = true;
    }

    let msg = IndexerQueueMessage {
        chain_id,
        indexer_rule_id: 0,
        indexer_rule_name: indexer_function.function_name.clone(),
        payload,
        block_height: current_block,
        indexer_function: indexer_function.clone(),
        is_historical: true,
    };

    match queue::send_to_indexer_queue(queue_client, queue_url, vec![msg]).await {
        Ok(_) => {}
        Err(err) => tracing::error!(
            target: crate::INDEXER,
            "#{} an error occurred when sending messages to the queue\n{:#?}",
            block_height,
            err
        ),
    }
}

// if block does not exist, try next block, up to MAX_RPC_BLOCKS_TO_PROCESS (20) blocks
pub async fn lookup_block_date_or_next_block_date(
    block_height: u64,
    client: &JsonRpcClient,
) -> anyhow::Result<DateTime<Utc>> {
    let mut current_block_height = block_height;
    let mut retry_count = 0;
    loop {
        let request = RpcBlockRequest {
            block_reference: BlockReference::BlockId(BlockId::Height(current_block_height)),
        };

        match client.call(request).await {
            Ok(response) => {
                let header = response.header;
                let timestamp_nanosec = header.timestamp_nanosec;
                return match Utc.timestamp_opt((timestamp_nanosec / 1000000000) as i64, 0) {
                    LocalResult::Single(date) => Ok(date),
                    LocalResult::Ambiguous(date, _) => Ok(date),
                    LocalResult::None => Err(anyhow::anyhow!("Unable to get block timestamp")),
                };
            }
            Err(_) => {
                tracing::debug!("RPC failed to get block: {:?}", current_block_height);
                retry_count += 1;
                if retry_count > MAX_RPC_BLOCKS_TO_PROCESS {
                    return Err(anyhow::anyhow!("Unable to get block"));
                }
                current_block_height += 1;
            }
        }
    }
}
