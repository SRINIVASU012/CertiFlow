import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis.js';

export const REMINDER_QUEUE_NAME = 'delayed-batch-reminder-queue';

export const reminderQueue = new Queue(REMINDER_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: true,
    removeOnFail: false
  }
});
