import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';
import { AUDIT_ACTIONS } from '../config/constants.js';

export const login = async (req, res) => {
  try {
    const { email, password } = req.validatedBody || req.body;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        trainingCentre: true,
        district: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid email or password.' }
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid email or password.' }
      });
    }

    const secret = process.env.JWT_SECRET || 'certiflow_super_secret_jwt_key_pragati_skills_2026';
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      secret,
      { expiresIn }
    );

    // Record login audit event
    await logAudit({
      userId: user.id,
      userRole: user.role,
      action: AUDIT_ACTIONS.LOGIN,
      entityType: 'USER',
      entityId: user.id,
      metadata: { email: user.email }
    });

    const { password: _, ...userData } = user;

    return res.json({
      success: true,
      data: {
        token,
        user: userData
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'An internal error occurred during login.' }
    });
  }
};

export const getMe = async (req, res) => {
  try {
    return res.json({
      success: true,
      data: { user: req.user }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve user profile.' }
    });
  }
};
