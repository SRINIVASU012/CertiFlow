import prisma from '../config/db.js';
import logger from './logger.js';

/**
 * Creates an immutable audit log entry in the database.
 * Every administrative or workflow decision MUST be recorded.
 */
export async function logAudit({
  userId = null,
  userRole = null,
  action,
  entityType,
  entityId,
  previousStatus = null,
  newStatus = null,
  reason = null,
  metadata = null,
  tx = null // Optional Prisma transaction client
}) {
  try {
    const client = tx || prisma;
    const audit = await client.auditLog.create({
      data: {
        userId,
        userRole,
        action,
        entityType,
        entityId: String(entityId),
        previousStatus,
        newStatus,
        reason,
        metadata: metadata ? metadata : undefined
      }
    });
    logger.info(`Audit logged: [${action}] on ${entityType}:${entityId} by ${userRole || 'SYSTEM'}`);
    return audit;
  } catch (err) {
    logger.error(`Failed to record audit log: ${err.message}`, err);
    // Never throw in audit logger unless inside a critical transaction,
    // but log failure clearly.
    if (tx) throw err;
  }
}
