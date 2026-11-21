import dotenv from 'dotenv';
dotenv.config();

import { createCertificateWorker } from './workers/certificateWorker.js';
import { createNotificationWorker } from './workers/notificationWorker.js';
import { checkDelayedBatches } from './workers/delayedBatchWorker.js';
import logger from './utils/logger.js';

logger.info('🚀 Starting CertiFlow Background Worker Process...');

const certWorker = createCertificateWorker();
const notifWorker = createNotificationWorker();

logger.info('✅ Certificate Generation Worker running');
logger.info('✅ WhatsApp Notification Worker running');

// Run delayed batch monitoring check periodically (every 10 minutes)
const DELAY_CHECK_INTERVAL_MS = 10 * 60 * 1000;
const thresholdHours = parseInt(process.env.DELAYED_BATCH_THRESHOLD_HOURS || '24', 10);

// Run an initial check shortly after startup
setTimeout(async () => {
  try {
    await checkDelayedBatches(thresholdHours);
  } catch (err) {
    logger.error('Error during initial delayed batch check:', err);
  }
}, 5000);

const reminderInterval = setInterval(async () => {
  try {
    await checkDelayedBatches(thresholdHours);
  } catch (err) {
    logger.error('Error in delayed batch check interval:', err);
  }
}, DELAY_CHECK_INTERVAL_MS);

// Graceful shutdown handling
const shutdown = async () => {
  logger.info('Stopping CertiFlow background workers...');
  clearInterval(reminderInterval);
  await certWorker.close();
  await notifWorker.close();
  logger.info('Workers safely terminated.');
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
