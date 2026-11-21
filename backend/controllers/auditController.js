import prisma from '../config/db.js';

export const getAuditLogs = async (req, res) => {
  try {
    const { entityType, entityId, action, limit = 100 } = req.query;
    const where = {};

    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = String(entityId);
    if (action) where.action = action;

    const auditLogs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit, 10)
    });

    return res.json({
      success: true,
      data: { auditLogs }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve audit logs.' }
    });
  }
};
