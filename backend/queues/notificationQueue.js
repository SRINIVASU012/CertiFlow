import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis.js';

export const NOTIFICATION_QUEUE_NAME = 'whatsapp-notification-queue';

export const notificationQueue = new Queue(NOTIFICATION_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1500
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
