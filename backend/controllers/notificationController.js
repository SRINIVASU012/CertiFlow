import prisma from '../config/db.js';

export const getNotifications = async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    const where = {};

    if (status) where.status = status;

    const notifications = await prisma.notification.findMany({
      where,
      include: {
        candidate: { select: { name: true, email: true, mobileNumber: true } },
        certificate: { select: { certificateNumber: true, status: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit, 10)
    });

    return res.json({
      success: true,
      data: { notifications }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve notifications.' }
    });
  }
};
