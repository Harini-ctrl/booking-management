 import { Request, Response } from 'express';
import Workout, { WorkoutStatus } from '../models/Workouts.model';
import mongoose from 'mongoose';
 
export const cancelWorkout = async (req: Request, res: Response): Promise<void> => {
  try {
    const workoutId = req.params.id;
 
    // Validate workoutId format
    if (!mongoose.Types.ObjectId.isValid(workoutId)) {
      res.status(400).json({
        error: 'Bad Request: Invalid workout ID format',
        toastMessage: 'Invalid workout ID format'
      });
      return;
    }
 
    const workout = await Workout.findById(workoutId);
 
    if (!workout) {
      res.status(404).json({
        error: 'Not Found: Workout does not exist',
        toastMessage: 'Workout not found'
      });
      return;
    }
 
    if (workout.coachStatus === WorkoutStatus.CANCELLED) {
      res.status(409).json({
        error: 'Conflict: Workout is already cancelled',
        toastMessage: 'This workout is already cancelled'
      });
      return;
    }
 
    // Check if the workout is within 24 hours
    const [day, month, year] = workout.date.split('-').map(Number);
    const [hours, minutes] = workout.time.split(':').map(Number);
 
    const workoutDate = new Date(year, month - 1, day);
    workoutDate.setHours(hours, minutes, 0, 0);
 
    const now = new Date();
    
    // Add a buffer of 5 hours and 30 minutes (IST offset) to account for timezone differences
    const bufferMs = (5 * 60 + 30) * 60 * 1000; // 5 hours and 30 minutes in milliseconds
    const adjustedNow = new Date(now.getTime() - bufferMs);
    
    // Calculate time difference in hours (using adjusted time for IST)
    const hoursRemaining = (workoutDate.getTime() - adjustedNow.getTime()) / (1000 * 60 * 60);
    
    console.log(`Workout time: ${workoutDate.toISOString()}`);
    console.log(`Server time: ${now.toISOString()}`);
    console.log(`Adjusted time for IST: ${adjustedNow.toISOString()}`);
    console.log(`Hours remaining: ${hoursRemaining}`);
 
    if (hoursRemaining < 24) {
      res.status(409).json({
        error: 'Conflict: Cannot cancel workout within 24 hours of start time',
        workoutTime: workoutDate.toISOString(),
        currentTime: now.toISOString(),
        adjustedCurrentTime: adjustedNow.toISOString(),
        hoursRemaining,
        toastMessage: 'Workouts cannot be cancelled within 24 hours of the scheduled time'
      });
      return;
    }
 
    // Update workout status
    workout.coachStatus = WorkoutStatus.CANCELLED;
    workout.clientStatus = WorkoutStatus.CANCELLED;
    await workout.save();
 
    res.status(200).json({
      message: 'Workout successfully canceled by coach',
      workout,
      toastMessage: 'Workout has been successfully cancelled'
    });
  } catch (error: unknown) {
    console.error('Error cancelling workout by coach:', error);
 
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
 
    res.status(500).json({
      error: 'Internal Server Error: An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      toastMessage: 'Something went wrong. Please try again later.'
    });
  }
};
 
export const getCoachWorkouts = async (req: Request, res: Response): Promise<void> => {
  try {
    // Extract coachId from query parameters
    const { coachId } = req.query;
    console.log('Received request to fetch workouts for coachId:', coachId);
   
    // Build query object
    const query: any = {};
   
    // Add coachId filter if provided
    if (coachId) {
      // Validate clientId format if provided
      if (typeof coachId === 'string' && !mongoose.Types.ObjectId.isValid(coachId)) {
        res.status(400).json({
          error: 'Bad Request: Invalid coach ID format',
          toastMessage: 'Invalid coach ID format'
        });
        return;
      }
     
      // Add to query if valid
      if (coachId) {
        query.coachId = coachId;
      }
    }
   
    console.log('Fetching workouts with query:', query);
   
    // Get workouts from database with filters, sorted by date and time
    const workouts = await Workout.find(query).sort({ date: 1, time: 1 });
   
    // Check if any workouts were found
    if (workouts.length === 0) {
      res.status(204).end(); // No Content - successful request but no content to return
      return;
    }
   
    // Get current date and time
    const now = new Date();
    
    // Add a buffer of 5 hours and 30 minutes (IST offset) to account for timezone differences
    const bufferMs = (5 * 60 + 30) * 60 * 1000; // 5 hours and 30 minutes in milliseconds
    const adjustedNow = new Date(now.getTime() - bufferMs);
   
    // Format adjusted date as DD-MM-YYYY to match database format
    const day = String(adjustedNow.getDate()).padStart(2, '0');
    const month = String(adjustedNow.getMonth() + 1).padStart(2, '0');
    const year = adjustedNow.getFullYear();
    const currentDate = `${day}-${month}-${year}`;
   
    // Format adjusted time as HH:MM to match database format
    const hours = String(adjustedNow.getHours()).padStart(2, '0');
    const minutes = String(adjustedNow.getMinutes()).padStart(2, '0');
    const currentTime = `${hours}:${minutes}`;
   
    console.log(`Server date/time: ${now.toISOString()}`);
    console.log(`Adjusted date/time for IST: ${adjustedNow.toISOString()}`);
    console.log(`Current date: ${currentDate}, current time: ${currentTime}`);
   
    // Helper function to convert DD-MM-YYYY to a comparable date value
    const convertDateToComparable = (dateStr: string): number => {
      const [day, month, year] = dateStr.split('-').map(Number);
      return year * 10000 + month * 100 + day; // Creates a number like YYYYMMDD
    };
    
    // Get comparable value for current date
    const comparableCurrentDate = convertDateToComparable(currentDate);
   
    // Array to track workouts that need status updates
    const workoutsToUpdate = [];
   
    // Check each workout to see if its date and time have passed
    for (const workout of workouts) {
      // Only check workouts that aren't already finished or cancelled
      if (workout.coachStatus !== 'Finished' && workout.coachStatus !== 'Cancelled') {
        // Convert workout date to comparable format
        const comparableWorkoutDate = convertDateToComparable(workout.date);
        
        // Compare dates properly
        if (comparableWorkoutDate < comparableCurrentDate) {
          // If workout date is earlier than current date
          workoutsToUpdate.push(workout._id);
          console.log(`Workout ${workout._id} date ${workout.date} is before current date ${currentDate} (${comparableWorkoutDate} < ${comparableCurrentDate})`);
        }
        else if (comparableWorkoutDate === comparableCurrentDate && workout.time < currentTime) {
          // If same date but workout time is earlier than current time
          workoutsToUpdate.push(workout._id);
          console.log(`Workout ${workout._id} time ${workout.time} has passed on current date ${currentDate}`);
        }
      }
    }
   
    // Update status for past workouts if any were found
    if (workoutsToUpdate.length > 0) {
      console.log(`Updating ${workoutsToUpdate.length} past workouts to "Waiting for Feedback" status`);
     
      await Workout.updateMany(
        { _id: { $in: workoutsToUpdate } },
        { $set: { coachStatus: 'Waiting for feedback' } }
      );
     
      // Re-fetch workouts to get updated data
      const updatedWorkouts = await Workout.find(query).sort({ date: 1, time: 1 });
     
      res.status(200).json({
        message: 'Workouts retrieved successfully',
        count: updatedWorkouts.length,
        workouts: updatedWorkouts,
        updatedCount: workoutsToUpdate.length,
        toastMessage: 'Workouts loaded successfully'
      });
      return;
    }
   
    // Return workouts with 200 OK status (no updates needed)
    res.status(200).json({
      message: 'Workouts retrieved successfully',
      count: workouts.length,
      workouts: workouts,
      toastMessage: 'Workouts loaded successfully'
    });
  } catch (error: unknown) {
    console.error('Error fetching booked workouts:', error);
   
    // Type guard for Error objects
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
   
    res.status(500).json({
      error: 'Internal Server Error: An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      toastMessage: 'Failed to load workouts. Please try again.'
    });
  }
};