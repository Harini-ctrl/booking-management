 import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
 
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    type?: string; // This is your user.type
  };
}
 
export const verifyToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
 
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized: User not authenticated',
      toastMessage: 'You must be logged in to perform this action',
    });
    return;
  }
 
  const token = authHeader.split(' ')[1];
 
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as AuthenticatedRequest['user'];
 
    if (!decoded || typeof decoded !== 'object') {
      res.status(401).json({
        error: 'Unauthorized: Token invalid',
        toastMessage: 'Invalid session. Please login again.',
      });
      return;
    }
 
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token verification failed:', err);
    res.status(403).json({
      error: 'Forbidden: Invalid or expired token',
      toastMessage: 'Session expired or invalid. Please login again.',
    });
  }
};