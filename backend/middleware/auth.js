import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';
import { ROLES } from '../config/constants.js';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required. No token provided.' }
      });
    }

    const secret = process.env.JWT_SECRET || 'certiflow_super_secret_jwt_key_pragati_skills_2026';
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      return res.status(403).json({
        success: false,
        error: { message: 'Invalid or expired authentication token.' }
      });
    }

    // Fetch user from DB to verify user still exists and get latest details
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        trainingCentre: true,
        district: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'User account not found.' }
      });
    }

    // Attach user to request (omit password hash)
    const { password, ...sanitizedUser } = user;
    req.user = sanitizedUser;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: 'Authentication failed due to internal error.' }
    });
  }
};

/**
 * Role-based authorization middleware
 */
export const requireRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required.' }
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          message: `Access denied. Role '${req.user.role}' is not authorized to perform this action.`,
          requiredRoles: allowedRoles
        }
      });
    }

    next();
  };
};

export const requireTrainingCentre = requireRoles(ROLES.TRAINING_CENTRE);
export const requireDistrictOfficer = requireRoles(ROLES.DISTRICT_OFFICER);
export const requireQualityTeam = requireRoles(ROLES.QUALITY_TEAM);
export const requireStateOffice = requireRoles(ROLES.STATE_OFFICE);
