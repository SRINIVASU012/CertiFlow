import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis.js';

export const CERTIFICATE_QUEUE_NAME = 'certificate-generation-queue';

export const certificateQueue = new Queue(CERTIFICATE_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: {
      count: 500,
      age: 3600 * 24
    },
    removeOnFail: {
      count: 1000
    }
  }
});
