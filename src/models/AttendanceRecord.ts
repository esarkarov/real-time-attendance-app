import mongoose, { Document, Schema } from 'mongoose';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE';

export interface IAttendanceRecord extends Document {
  studentId: mongoose.Types.ObjectId;
  sessionId: mongoose.Types.ObjectId;
  status: AttendanceStatus;
  markedAt: Date;
  createdAt: Date;
}

const AttendanceRecordSchema = new Schema<IAttendanceRecord>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true },
    status: {
      type: String,
      enum: ['PRESENT', 'ABSENT', 'LATE'],
      required: true,
      default: 'PRESENT',
    },
    markedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Prevent duplicate attendance record for same student + session
AttendanceRecordSchema.index({ studentId: 1, sessionId: 1 }, { unique: true });

export const AttendanceRecord = mongoose.model<IAttendanceRecord>(
  'AttendanceRecord',
  AttendanceRecordSchema
);
