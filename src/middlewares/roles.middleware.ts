import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './verifytoken.middlewares';
 
export const requireCoach = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  console.log('User Type:', req.user?.type); // Log the user type for debugging
  if (req.user?.type !== 'coach') {
    res.status(403).json({
      error: 'Forbidden: Only coaches can access this route',
      toastMessage: 'You are not authorized to perform this action',
    });
    return;
  }
  next();
};
 
export const requireClient = (
  req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void => {
  if (req.user?.type !== 'client') {
    res.status(403).json({
      error: 'Forbidden: Only clients can access this route',
      toastMessage: 'You are not authorized to perform this action',
    });
    return;
  }
  next();
}
 
export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.type !== 'admin') {
    res.status(403).json({
      error: 'Forbidden: Only admins can access this route',
      toastMessage: 'You are not authorized to perform this action',
    });
    return;
  }
  next();
}