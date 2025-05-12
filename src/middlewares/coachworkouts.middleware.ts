import { Request, Response, NextFunction } from 'express';
import Workout, { WorkoutStatus } from '../models/Workouts.model';
import mongoose from 'mongoose';

export const checkAlreadyCancelled = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const workoutId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(workoutId)) {
     res.status(400).json({ error: 'Invalid workout ID' });
  }

  // If either coach or client has already cancelled, don't allow again

  // Attach workout to request so controller doesn't need to re-fetc

  next();
};
