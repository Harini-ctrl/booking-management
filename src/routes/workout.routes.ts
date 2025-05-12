 // routes/workoutRoutes.ts
import express from 'express';
import { createWorkout } from '../controllers/Workout.controller';
import { cancelWorkout } from '../controllers/Workout.controller';
import { getBookedWorkouts } from '../controllers/Workout.controller';
import { verifyToken } from '../middlewares/verifytoken.middlewares'; 
import { requireClient } from '../middlewares/roles.middleware'; 
const router = express.Router();

router.post('/workouts', verifyToken,requireClient, (req, res) => {
  createWorkout(req, res); // This will only be executed if the token is valid
});
 
router.get('/workouts/booked', verifyToken, requireClient,(req, res) => {
  getBookedWorkouts(req, res); // This will only be executed if the token is valid
});
 
router.patch('/workouts/:workoutId', verifyToken,requireClient, (req, res) => {
  cancelWorkout(req, res); // This will only be executed if the token is valid
});
export default router;