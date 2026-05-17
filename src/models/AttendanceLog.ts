import mongoose, { Document, Schema } from "mongoose";

export interface IAttendanceLog extends Document {
  attendanceRecordId: mongoose.Types.ObjectId;
  changedBy: mongoose.Types.ObjectId;
  previousStatus: string;
  newStatus: string;
  changedAt: Date;
}

const AttendanceLogSchema = new Schema<IAttendanceLog>({
  attendanceRecordId: {
    type: Schema.Types.ObjectId,
    ref: "AttendanceRecord",
    required: true,
  },
  changedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  previousStatus: { type: String, required: true },
  newStatus: { type: String, required: true },
  changedAt: { type: Date, default: Date.now },
});

export const AttendanceLog = mongoose.model<IAttendanceLog>(
  "AttendanceLog",
  AttendanceLogSchema,
);
