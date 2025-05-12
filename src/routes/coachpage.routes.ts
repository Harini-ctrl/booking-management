 import exprees from 'express';
import {cancelWorkout, getCoachWorkouts } from '../controllers/coachworkout.controller';
import { checkAlreadyCancelled } from '../middlewares/coachworkouts.middleware';
import { createCoachFeedback } from '../controllers/coachFeedback.controller';
import { validateFeedbackInput } from '../middlewares/coachFeedback.middleware';
import { verifyToken } from '../middlewares/verifytoken.middlewares';  
import { requireCoach } from '../middlewares/roles.middleware';
 
const router = exprees.Router();
 
router.get('/workouts/booked',verifyToken,requireCoach, getCoachWorkouts);
router.patch('/workouts/:id', verifyToken,requireCoach, checkAlreadyCancelled, cancelWorkout);
 
export default router;