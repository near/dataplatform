import Indexer from "./indexer.js";

export const consumer = async (event) => {
    const indexer = new Indexer('mainnet', 'us-west-2');
    const functions = await indexer.fetchIndexerFunctions();
    console.log(`Running ${Object.keys(functions)?.length} functions`);

    for (const record of event.Records) {
        try {
            const jsonBody = JSON.parse(record.body);
            const block_height = jsonBody.alert_message.block_height;
            const mutations = await indexer.runFunctions(block_height, functions, {imperative: false});
            return {statusCode: 200, body: {"# of mutations applied": Object.keys(mutations).length}};
        } catch (error) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: error,
                }),
            };

        }
    }
};
