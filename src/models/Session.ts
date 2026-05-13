import mongoose, { Document, Schema } from "mongoose";

export type SessionStatus = "UPCOMING" | "ONGOING" | "CLOSED";

export interface ISession extends Document {
  courseId: mongoose.Types.ObjectId;
  date: Date;
  location: string;
  status: SessionStatus;
  lateThresholdMinutes: number;
  createdAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    date: { type: Date, required: true },
    location: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["UPCOMING", "ONGOING", "CLOSED"],
      default: "UPCOMING",
    },
    lateThresholdMinutes: { type: Number, default: 15 },
  },
  { timestamps: true },
);

export const Session = mongoose.model<ISession>("Session", SessionSchema);
