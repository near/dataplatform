import Indexer from './indexer';

describe('Indexer', () => {

    test('Indexer.runFunctions() should execute a test function against a given block', async () => {
        const indexer = new Indexer('mainnet', 'us-west-2');
        const functions = {};
        functions['buildnear.testnet/test'] = {code: 'context.graphql.mutation(`set(functionName: "buildnear.testnet/test", key: "BlockHeight", data: "${block.header().height}")`);'};
        const block_height = 85376546;
        const mutations = await indexer.runFunctions(block_height, functions);
        expect(mutations).toContain("set(functionName: \"buildnear.testnet/test\", key: \"BlockHeight\", data: \"85376546\")");
    });

    test('Indexer.runFunctions() should execute a near social function against a given block', async () => {
        const indexer = new Indexer('mainnet', 'us-west-2');
        const functions = {};
        functions['buildnear.testnet/test'] = {code:

`           const SOCIAL_DB = 'social.near';
            function base64decode(encodedValue) {
              let buff = Buffer.from(encodedValue, 'base64');
              return JSON.parse(buff.toString('utf-8'));
            }

            const nearSocialPosts = block
                .actions()
                .filter(action => action.receiverId === SOCIAL_DB)
                .flatMap(action =>
                    action
                        .operations
                        .map(operation => operation['FunctionCall'])
                        .filter(operation => operation?.methodName === 'set')
                        .map(functionCallOperation => ({
                            ...functionCallOperation,
                            args: base64decode(functionCallOperation.args),
                            receiptId: action.receiptId,
                        }))
                        .filter(functionCall => {
                            const accountId = Object.keys(functionCall.args.data)[0];
                            return 'post' in functionCall.args.data[accountId]
                                || 'index' in functionCall.args.data[accountId];
                        })
                );
        if (nearSocialPosts.length > 0) {
            const blockHeight = block.blockHeight;
            const blockTimestamp = block.header().timestampNanosec;
            nearSocialPosts.forEach(postAction => {
                const accountId = Object.keys(postAction.args.data)[0];
                if (postAction.args.data[accountId].post && 'main' in postAction.args.data[accountId].post) {
                    const postData = {account_id: accountId, block_height: blockHeight, block_timestamp: blockTimestamp,
                        receipt_id: postAction.receiptId, post: postAction.args.data[accountId].post.main
                        };
                    const mutationData = {object: {account_id: accountId, block_height: postData.block_height.toString(),
                     block_timestamp: postData.block_timestamp, receipt_id: postData.receipt_id, content: JSON.stringify(postData) }};
                    context.graphql.mutation('insert_posts_one(' + JSON.stringify(mutationData).replace('{', '').slice(0,-1).replace('"object"', 'object').replace('"account_id"', 'account_id').replace('"block_height"', 'block_height').replace('"block_timestamp"', 'block_timestamp').replace('"receipt_id"', 'receipt_id').replace('"content"', 'content') + ') { id }');
                }
            });
        }
`       };

        const block_height = 85242526; // post,  // 84940247; // comment
        const mutations = await indexer.runFunctions(block_height, functions);
        expect(mutations).toContain("set(functionName:\"buildnear.testnet/test\",key:\"LatestPost\",data:\"{\\\"account_id\\\":\\\"mr27.near\\\",\\\"block_height\\\":85242526,\\\"block_timestamp\\\":\\\"1676415623137096089\\\",\\\"receipt_id\\\":\\\"4n8e41C1zkMVW2fttKcxFWhdUizyN8WLHEQW5rUsy3f6\\\",\\\"post\\\":\\\"foo\\\"}\")");
    });
});

