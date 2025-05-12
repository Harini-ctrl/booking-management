 import express from "express";
import {validateFeedbackInput} from '../middlewares/coachFeedback.middleware';
import { createCoachFeedback } from "../controllers/coachFeedback.controller";
import { verifyToken } from "../middlewares/verifytoken.middlewares";  
import { requireCoach } from "../middlewares/roles.middleware";
const router = express.Router();
 
router.post('/feedbacks',verifyToken, requireCoach, validateFeedbackInput, createCoachFeedback)
export default router;