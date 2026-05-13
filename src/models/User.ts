import mongoose, { Document, Schema } from "mongoose";

export type UserRole = "TEACHER" | "STUDENT";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  studentId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    role: { type: String, enum: ["TEACHER", "STUDENT"], required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Student", default: null },
  },
  { timestamps: true },
);

export const User = mongoose.model<IUser>("User", UserSchema);
