import mongoose, { Document, Schema } from 'mongoose';

export interface ISession extends Document {
  courseId: mongoose.Types.ObjectId;
  date: Date;
  location: string;
  createdAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    date: { type: Date, required: true },
    location: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export const Session = mongoose.model<ISession>('Session', SessionSchema);
