import mongoose, { Schema, Document } from "mongoose";

// Define enum for status values
enum WorkoutStatus {
  SCHEDULED = "Scheduled",
  FINISHED = "Finished",
  CANCELLED = "Cancelled",
  WAITING_FOR_FEEDBACK = "Waiting for feedback"
}

// Define the interface
interface IWorkout extends Document {
  coachId: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  type: string;
  date: string;
  time: string;
  coachStatus: WorkoutStatus;
  clientStatus: WorkoutStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Create the schema
const WorkoutSchema = new Schema<IWorkout>(
  {
    coachId: { type: Schema.Types.ObjectId, required: true },
    clientId: { type: Schema.Types.ObjectId, required: true },
    type: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    coachStatus: {
      type: String,
      required: true,
      enum: Object.values(WorkoutStatus),
      default: WorkoutStatus.SCHEDULED,
    },
    clientStatus: {
      type: String,
      required: true,
      enum: Object.values(WorkoutStatus),
      default: WorkoutStatus.SCHEDULED,
    },
  },
  { timestamps: true }
);

// Export the model
const Workout = mongoose.model<IWorkout>("Workout", WorkoutSchema);

// Export both the model and the enum for use in other files
export { Workout, WorkoutStatus };
export default Workout;