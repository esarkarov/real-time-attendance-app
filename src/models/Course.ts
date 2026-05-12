import mongoose, { Document, Schema } from 'mongoose';

export interface ICourse extends Document {
  name: string;
  code: string;
  instructor: string;
  createdAt: Date;
}

const CourseSchema = new Schema<ICourse>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    instructor: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export const Course = mongoose.model<ICourse>('Course', CourseSchema);
