import path from 'path';
import { Worker, isMainThread } from 'worker_threads';

import { type Message } from './types';
import { METRICS } from '../metrics';
import { Gauge } from 'prom-client';

export default class StreamHandler {
  private readonly worker?: Worker;

  constructor (
    streamKey: string
  ) {
    if (isMainThread) {
      this.worker = new Worker(path.join(__dirname, 'worker.js'), {
        workerData: {
          streamKey,
        },
      });

      this.worker.on('message', this.handleMessage);
    } else {
      throw new Error('StreamHandler should not be instantiated in a worker thread');
    }
  }

  private handleMessage (message: Message): void {
    if (METRICS[message.type] instanceof Gauge) {
      (METRICS[message.type] as Gauge).labels(message.labels).set(message.value);
    }
  }
}
