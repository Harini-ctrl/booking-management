// routes/feedbackRoutes.ts
import express from 'express';
import { createFeedback } from '../controllers/Feedback.controller';
import { verifyToken } from '../middlewares/verifytoken.middlewares'; // Adjust the import path as necessary
import { requireClient } from '../middlewares/roles.middleware'; // Adjust the import path as necessary
const router = express.Router();

router.post('/feedbacks',verifyToken,requireClient, (req, res) => {
  createFeedback(req, res);
});

export default router;