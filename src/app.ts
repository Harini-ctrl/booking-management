import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import workoutRoutes from './routes/workout.routes';
import mongoose from 'mongoose';
import feedbackRoutes from './routes/feedback.routes';
import coachpageRoutes from './routes/coachpage.routes';
import coachfeedbackRoutes from './routes/coachfeedback.routes';

const app = express();
// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// Routes
app.use('/dev/client', workoutRoutes);
app.use('/dev/client', feedbackRoutes);
app.use('/dev/coaches-page',coachpageRoutes);
app.use('/dev/coaches-page',coachfeedbackRoutes);

export default app;
