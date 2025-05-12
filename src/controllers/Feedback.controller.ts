 // controllers/FeedbackController.ts
import { Request, Response } from 'express';
import Feedback from '../models/Feedbacks.model';
import Workout, { WorkoutStatus } from '../models/Workouts.model';
import mongoose from 'mongoose';

export const createFeedback = async (req: Request, res: Response): Promise<void> => {
  try {
    // Extract data from request body
    const { clientId, coachId, workoutId, comment, rating } = req.body;
    
    // Check for required fields
    const missingFields = [];
    if (!clientId) missingFields.push('clientId');
    if (!coachId) missingFields.push('coachId');
    if (!workoutId) missingFields.push('workoutId');
    if (!comment) missingFields.push('comment');
    if (!rating) missingFields.push('rating');

    if (missingFields.length > 0) {
      // Create a user-friendly message
      const fieldWord = missingFields.length === 1 ? 'field' : 'fields';
      const toastMessage = missingFields.length === 1 
        ? `Please provide the ${missingFields[0]} field` 
        : `Please provide the following ${fieldWord}: ${missingFields.join(', ')}`;
      
      res.status(400).json({ 
        error: 'Bad Request: Missing required fields',
        missingFields: missingFields,
        toastMessage: toastMessage
      });
      return;
    }

    // Validate ObjectIds
    const invalidIds = [];
    if (!mongoose.Types.ObjectId.isValid(clientId)) invalidIds.push('clientId');
    if (!mongoose.Types.ObjectId.isValid(coachId)) invalidIds.push('coachId');
    if (!mongoose.Types.ObjectId.isValid(workoutId)) invalidIds.push('workoutId');
    
    if (invalidIds.length > 0) {
      const fieldWord = invalidIds.length === 1 ? 'ID' : 'IDs';
      const toastMessage = invalidIds.length === 1 
        ? `Invalid ${invalidIds[0]} format` 
        : `Invalid format for the following ${fieldWord}: ${invalidIds.join(', ')}`;
      
      res.status(422).json({ 
        error: 'Unprocessable Entity: Invalid ID format',
        invalidFields: invalidIds,
        toastMessage: toastMessage
      });
      return;
    }

    // Validate rating (should be between 1-5)
    const ratingNum = Number(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      res.status(422).json({ 
        error: 'Unprocessable Entity: Rating must be a number between 1 and 5',
        invalidField: 'rating',
        toastMessage: 'Rating must be between 1 and 5'
      });
      return;
    }

    // Check if the workout exists
    const workout = await Workout.findById(workoutId);
    if (!workout) {
      res.status(404).json({ 
        error: 'Not Found: Workout does not exist',
        toastMessage: 'The workout you are trying to review does not exist'
      });
      return;
    }

    // Check if the workout is scheduled for a future date
    const workoutDate = workout.date; // Format: "DD-MM-YYYY"
    const workoutTime = workout.time; // Format: "HH:MM" (24-hour format)
    
    // Parse the date in DD-MM-YYYY format
    const [day, month, year] = workoutDate.split('-').map(Number);
    const [hours, minutes] = workoutTime.split(':').map(Number);
    
    // Create Date object (months are 0-indexed in JavaScript)
    const workoutDateTime = new Date(year, month - 1, day, hours, minutes);
    const currentDateTime = new Date();
    
    if (workoutDateTime > currentDateTime) {
      res.status(422).json({
        error: 'Unprocessable Entity: Cannot provide feedback for future workouts',
        toastMessage: 'You cannot provide feedback for workouts scheduled in the future'
      });
      return;
    }

    // Check if feedback already exists for this workout and client
    const existingFeedback = await Feedback.findOne({ workoutId, clientId });
    if (existingFeedback) {
      res.status(409).json({ 
        error: 'Conflict: Feedback already exists for this workout',
        toastMessage: 'You have already provided feedback for this workout'
      });
      return;
    }

    // Create and save the feedback
    const feedback = new Feedback({
      clientId,
      coachId,
      workoutId,
      comment,
      rating: ratingNum // Store as number
    });

    const savedFeedback = await feedback.save();
    
    // Update the workout's clientStatus to FINISHED
    await Workout.findByIdAndUpdate(
      workoutId,
      { $set: { clientStatus: WorkoutStatus.FINISHED } },
      { new: true }
    );
    
    // Return success response
    res.status(201).json({
      message: 'Feedback submitted successfully',
      feedback: savedFeedback,
      toastMessage: 'Thank you for your feedback!'
    });
  } catch (error: unknown) {
    console.error('Error creating feedback:', error);
    
    // Check for duplicate key error (MongoDB error code 11000)
    if (error instanceof Error && 
        'code' in (error as any) && 
        (error as any).code === 11000) {
      res.status(409).json({ 
        error: 'Conflict: Feedback already exists for this workout',
        toastMessage: 'You have already provided feedback for this workout'
      });
      return;
    }
    
    // Type guard for Error objects
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    res.status(500).json({ 
      error: 'Internal Server Error: An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      toastMessage: 'Something went wrong. Please try again later.'
    });
  }
};