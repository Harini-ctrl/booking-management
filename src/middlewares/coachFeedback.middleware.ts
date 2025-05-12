import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

/**
 * Middleware to validate feedback input data
 */
export const validateFeedbackInput = (req: Request, res: Response, next: NextFunction): void => {
    const { clientId, coachId, workoutId, comment } = req.body;
    
   console.log('Received feedback data:', req.body);
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(clientId) || 
        !mongoose.Types.ObjectId.isValid(coachId) || 
        !mongoose.Types.ObjectId.isValid(workoutId)) {
      res.status(422).json({ 
        error: 'Unprocessable Entity: Invalid ID format',
        toastMessage: 'Invalid ID format provided'
      });
      return;
    }
    next()
}


