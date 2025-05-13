 import { Request, Response } from 'express';
import Feedback from '../models/coachFeedback.model';
import { Workout, WorkoutStatus } from '../models/Workouts.model';
 
/**
 * Create a new feedback from coach
 * POST /api/coach-feedback
 */
export const createCoachFeedback = async (req: Request, res: Response): Promise<void> => {
  try {
    // Extract data from request body
    const { clientId, coachId, workoutId, comment } = req.body;
 
    // Check for required fields
    const requiredFields = ['clientId', 'coachId', 'workoutId', 'comment'];
    const missingFields = requiredFields.filter((field) => !req.body[field]);
 
    if (missingFields.length > 0) {
      res.status(400).json({
        error: 'Bad Request: Missing required fields',
        missingFields,
        toastMessage: `Please fill in the following required fields: ${missingFields.join(', ')}`
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
 
    // Check if the workout is already marked as 'Finished'
    if (workout.coachStatus === WorkoutStatus.FINISHED) {
      res.status(409).json({
        error: 'Conflict: Feedback already submitted or workout already marked as finished',
        toastMessage: 'Feedback has already been submitted for this workout'
      });
      return;
    }
 
    // Parse the date in DD-MM-YYYY format
    const [day, month, year] = workout.date.split('-').map(Number);
    const [hours, minutes] = workout.time.split(':').map(Number);
    
    // Create Date object (months are 0-indexed in JavaScript)
    const workoutDateTime = new Date(year, month - 1, day, hours, minutes);
    
    // Get current date and time
    const now = new Date();
    
    // Add a buffer of 5 hours and 30 minutes (IST offset) to account for timezone differences
    const bufferMs = (5 * 60 + 30) * 60 * 1000; // 5 hours and 30 minutes in milliseconds
    const adjustedNow = new Date(now.getTime() - bufferMs);
    
    console.log(`Workout date/time: ${workoutDateTime.toISOString()}`);
    console.log(`Server date/time: ${now.toISOString()}`);
    console.log(`Adjusted date/time for IST: ${adjustedNow.toISOString()}`);
    console.log(`Is workout in past? ${workoutDateTime < adjustedNow}`);
 
    // Check if the workout date and time have passed (using adjusted time for IST)
    if (workoutDateTime < adjustedNow) {
      console.log(`Workout ${workout._id} is eligible for feedback.`);
    } else {
      res.status(400).json({
        error: 'Bad Request: Workout is not yet completed',
        toastMessage: 'You can only provide feedback for workouts that have already occurred',
        debug: {
          workoutTime: workoutDateTime.toISOString(),
          serverTime: now.toISOString(),
          adjustedTime: adjustedNow.toISOString()
        }
      });
      return;
    }
 
    // Check if feedback already exists for this workout and client
    const existingFeedback = await Feedback.findOne({ workoutId, coachId });
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
      comment
    });
 
    const savedFeedback = await feedback.save();
 
    // Update the workout status to 'Finished'
    workout.coachStatus = WorkoutStatus.FINISHED;
    await workout.save();
 
    // Return success response
    res.status(201).json({
      message: 'Feedback submitted successfully',
      feedback: savedFeedback,
      toastMessage: 'Thank you for your feedback!'
    });
  } catch (error: unknown) {
    console.error('Error creating coach feedback:', error);
 
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
 
    res.status(500).json({
      error: 'Internal Server Error: An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      toastMessage: 'Something went wrong. Please try again later.'
    });
  }
};