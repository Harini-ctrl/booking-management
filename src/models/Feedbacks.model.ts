 // models/Feedback.ts
import mongoose, { Schema, Document } from 'mongoose';

// Define the interface for Feedback document
interface IFeedback extends Document {
  clientId: mongoose.Types.ObjectId;
  coachId: mongoose.Types.ObjectId;
  workoutId: mongoose.Types.ObjectId;
  comment: string;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
}

// Create the schema
const FeedbackSchema = new Schema<IFeedback>(
  {
    clientId: { 
      type: Schema.Types.ObjectId, 
      required: true,
      ref: 'User' // Assuming you have a User model
    },
    coachId: { 
      type: Schema.Types.ObjectId, 
      required: true,
      ref: 'User' // Assuming you have a User model
    },
    workoutId: { 
      type: Schema.Types.ObjectId, 
      required: true,
      ref: 'Workout'
    },
    comment: { 
      type: String, 
      required: true 
    },
    rating: { 
      type: Number, 
      required: true,
      min: 1,
      max: 5
    }
  }, 
  { timestamps: true }
);

// Prevent duplicate feedback for the same workout
FeedbackSchema.index({ workoutId: 1, clientId: 1 }, { unique: true });

// Export the model
const Feedback = mongoose.model<IFeedback>('Feedback', FeedbackSchema);

export default Feedback;