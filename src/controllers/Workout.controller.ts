import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Workout, { WorkoutStatus } from '../models/Workouts.model';

export const createWorkout = async (req: Request, res: Response): Promise<void> => {
  try {
    // Extract data from request body
    const { coachId, clientId, type, date, time, coachStatus, clientStatus } = req.body;
    
    console.log(`Received workout request:`, req.body);
    
    // Check for required fields
    const missingFields = [];
    if (!coachId) missingFields.push('coachId');
    if (!clientId) missingFields.push('clientId');
    if (!type) missingFields.push('type');
    if (!date) missingFields.push('date');
    if (!time) missingFields.push('time');

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
    if (!mongoose.Types.ObjectId.isValid(coachId)) invalidIds.push('coachId');
    if (!mongoose.Types.ObjectId.isValid(clientId)) invalidIds.push('clientId');
    
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

    // Validate date format (DD-MM-YYYY)
    const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
    if (!dateRegex.test(date)) {
      res.status(422).json({
        error: 'Unprocessable Entity: Invalid date format',
        invalidField: 'date',
        expectedFormat: 'DD-MM-YYYY',
        toastMessage: 'Date must be in DD-MM-YYYY format'
      });
      return;
    }

    // Validate time format (24-hour format like "14:30")
    const timeFormatRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
    if (!timeFormatRegex.test(time)) {
      res.status(422).json({ 
        error: 'Unprocessable Entity: Invalid time format',
        invalidField: 'time',
        expectedFormat: '24-hour (HH:MM)',
        example: '14:30',
        toastMessage: 'Please use 24-hour time format (e.g., 14:30)'
      });
      return;
    }

    // Parse and validate date
    try {
      // Parse date (DD-MM-YYYY format)
      const [day, month, year] = date.split('-').map(Number);
      
      // Create date object with the correct year, month (0-indexed), and day
      const workoutDate = new Date(year, month - 1, day);
      
      // Parse time (24-hour format)
      const [hours, minutes] = time.split(':').map(Number);
      workoutDate.setHours(hours, minutes, 0, 0);
      
      // Get current date for comparison
      const currentDate = new Date();
      
      console.log(`Workout date: ${workoutDate.toISOString()}`);
      console.log(`Current date: ${currentDate.toISOString()}`);
      console.log(`Is workout in past? ${workoutDate < currentDate}`);
      
      // Check if workout date is in the past
      if (workoutDate < currentDate) {
        res.status(422).json({ 
          error: 'Unprocessable Entity: Cannot create workout for a past date and time',
          workoutDateTime: workoutDate.toISOString(),
          currentDateTime: currentDate.toISOString(),
          toastMessage: 'Cannot schedule workouts in the past'
        });
        return;
      }
    } catch (dateError) {
      console.error('Date parsing error:', dateError);
      res.status(422).json({ 
        error: 'Unprocessable Entity: Invalid date or time format',
        details: dateError instanceof Error ? dateError.message : 'Unknown error',
        expectedDateFormat: 'DD-MM-YYYY',
        expectedTimeFormat: '24-hour (HH:MM)',
        toastMessage: 'Invalid date or time format'
      });
      return;
    }

    // Check for conflicting bookings (same coach, date and time)
    const existingWorkout = await Workout.findOne({
      coachId,
      date,
      time
    });

    if (existingWorkout) {
      res.status(409).json({ 
        error: 'Conflict: This time slot is already booked with this coach',
        toastMessage: 'This time slot is already booked'
      });
      return;
    }

    // If all checks pass, create the workout
    const workout = new Workout(req.body);
    const savedWorkout = await workout.save();
    
    // Return 201 Created status for successful creation
    res.status(201).json({
      message: 'Workout successfully booked',
      workout: savedWorkout,
      toastMessage: 'Your workout has been successfully booked'
    });
  } catch (error: unknown) {
    console.error('Error creating workout:', error);
    
    // Type guard for Error objects
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    res.status(500).json({ 
      error: 'Internal Server Error: An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      toastMessage: 'Something went wrong. Please try again later.'
    });
  }
};export const getBookedWorkouts = async (req: Request, res: Response): Promise<void> => {
  try {
    // Extract clientId from query parameters
    const { clientId } = req.query;
    
    // Build query object
    const query: any = {};
    
    // Add clientId filter if provided
    if (clientId) {
      // Validate clientId format if provided
      if (typeof clientId === 'string' && !mongoose.Types.ObjectId.isValid(clientId)) {
        res.status(400).json({ 
          error: 'Bad Request: Invalid client ID format',
          toastMessage: 'Invalid client ID format'
        });
        return;
      }
      
      // Add to query if valid
      if (clientId) {
        query.clientId = clientId;
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
    
    // Format current date as DD-MM-YYYY to match database format
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const currentDate = `${day}-${month}-${year}`;
    
    // Format current time as HH:MM to match database format
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${hours}:${minutes}`;
    
    console.log(`Current date: ${currentDate}, current time: ${currentTime}`);
    
    // Array to track workouts that need status updates
    const workoutsToUpdate = [];
    
    // Check each workout to see if its date and time have passed
    for (const workout of workouts) {
      // Only check workouts that aren't already finished or cancelled
      if (workout.clientStatus !== 'Finished' && workout.clientStatus !== 'Cancelled') {
        // Compare dates first
        if (workout.date < currentDate) {
          // If workout date is earlier than current date
          workoutsToUpdate.push(workout._id);
          console.log(`Workout ${workout._id} date ${workout.date} is before current date ${currentDate}`);
        } 
        else if (workout.date === currentDate && workout.time < currentTime) {
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
        { $set: { clientStatus: 'Waiting for feedback' } }
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

export const cancelWorkout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workoutId } = req.params;
    
    // Validate workoutId format
    if (!mongoose.Types.ObjectId.isValid(workoutId)) {
      res.status(400).json({ 
        error: 'Bad Request: Invalid workout ID format',
        toastMessage: 'Invalid workout ID format'
      });
      return;
    }
    
    // Find the workout
    const workout = await Workout.findById(workoutId);
    
    // Check if workout exists
    if (!workout) {
      res.status(404).json({ 
        error: 'Not Found: Workout does not exist',
        toastMessage: 'Workout not found'
      });
      return;
    }
    
    // Check if workout is already cancelled
    if (workout.clientStatus === WorkoutStatus.CANCELLED) {
      res.status(409).json({ 
        error: 'Conflict: Workout is already cancelled',
        toastMessage: 'This workout is already cancelled'
      });
      return;
    }
    
    // Check if workout is within 24 hours
    const now = new Date();
    
    // Parse workout date and time
    const [day, month, year] = workout.date.split('-').map(Number);
    const [hours, minutes] = workout.time.split(':').map(Number);
    
    const workoutDate = new Date(year, month - 1, day);
    workoutDate.setHours(hours, minutes, 0, 0);
    
    // Calculate time difference in hours
    const timeDiff = (workoutDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Check if workout is within 24 hours
    if (timeDiff < 24) {
      res.status(409).json({ 
        error: 'Conflict: Cannot cancel workout within 24 hours of start time',
        toastMessage: 'Workouts cannot be cancelled within 24 hours of the scheduled time',
        workoutTime: workoutDate.toISOString(),
        currentTime: now.toISOString(),
        hoursRemaining: timeDiff
      });
      return;
    }
    
    // Update the workout status
    workout.clientStatus = WorkoutStatus.CANCELLED;
    workout.coachStatus = WorkoutStatus.CANCELLED;
    await workout.save();
    
    // Return success response
    res.status(200).json({
      message: 'Workout successfully canceled',
      workout: workout,
      toastMessage: 'Workout has been successfully canceled'
    });
  } catch (error: unknown) {
    console.error('Error cancelling workout:', error);
    
    // Type guard for Error objects
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    res.status(500).json({ 
      error: 'Internal Server Error: An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      toastMessage: 'Something went wrong. Please try again later.'
    });
  }
};