 import { Request, Response } from 'express';
import Feedback from '../models/coachFeedback.model';
import { Workout,WorkoutStatus } from '../models/Workouts.model';
 
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
 
    // Helper function to parse date and time into a Date object
const parseDateTime = (dateString: string, timeString: string): Date => {
  const [day, month, year] = dateString.split('-').map(Number);
  const [hour, minute] = timeString.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute);
};
 
// Parse workout date and time into a Date object
const workoutDateTime = parseDateTime(workout.date, workout.time);
 
// Parse current date and time into a Date object
const now = new Date();
const currentDateTime = parseDateTime(
  `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`,
  `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
);
 
console.log(`Parsed workout date: ${workoutDateTime}, current date: ${currentDateTime}`);
 
// Check if the workout date and time have passed
if (workoutDateTime < currentDateTime) {
  console.log(`Workout ${workout._id} is eligible for feedback.`);
} else {
  res.status(400).json({
    error: 'Bad Request: Workout is not yet completed',
    toastMessage: 'You can only provide feedback for workouts that have already occurred'
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