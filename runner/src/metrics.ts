import express from 'express';
import promClient from 'prom-client';

const UNPROCESSED_STREAM_MESSAGES = new promClient.Gauge({
  name: 'queryapi_runner_unprocessed_stream_messages',
  help: 'Number of Redis Stream messages not yet processed',
  labelNames: ['indexer', 'type'],
});

const EXECUTION_DURATION = new promClient.Gauge({
  name: 'queryapi_runner_execution_duration_milliseconds',
  help: 'Time taken to execute an indexer function',
  labelNames: ['indexer', 'type'],
});

const CACHE_HIT = new promClient.Counter({
  name: 'queryapi_runner_cache_hit',
  help: 'The number of times cache was hit successfully',
  labelNames: ['type']
});

const CACHE_MISS = new promClient.Counter({
  name: 'queryapi_runner_cache_miss',
  help: 'The number of times cache was missed',
  labelNames: ['type']
});

export const METRICS = {
  EXECUTION_DURATION,
  UNPROCESSED_STREAM_MESSAGES,
  CACHE_HIT,
  CACHE_MISS,
  register: promClient.register
};

export const startServer = async (): Promise<void> => {
  const app = express();

  // https://github.com/DefinitelyTyped/DefinitelyTyped/issues/50871
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', promClient.register.contentType);

    const metrics = await promClient.register.metrics();
    res.send(metrics);
  });

  app.listen(process.env.PORT, () => {
    console.log(`Metrics server running on http://localhost:${process.env.PORT}`);
  });
};
