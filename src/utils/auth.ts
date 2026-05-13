import jwt from "jsonwebtoken";
import { IUser } from "../models/User";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = "7d";

export interface JwtPayload {
  userId: string;
  role: "TEACHER" | "STUDENT";
  studentId?: string;
}

export function signToken(user: IUser): string {
  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
      studentId: user.studentId?.toString(),
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export interface AuthContext {
  user: JwtPayload | null;
}

export function getAuthContext(authHeader?: string): AuthContext {
  if (!authHeader?.startsWith("Bearer ")) return { user: null };
  try {
    const token = authHeader.slice(7);
    return { user: verifyToken(token) };
  } catch {
    return { user: null };
  }
}

// ── Role guards ───────────────────────────────────────────────────────────────

export function requireAuth(context: AuthContext): JwtPayload {
  if (!context.user) throw new Error("Unauthorized. Please login first.");
  return context.user;
}

export function requireTeacher(context: AuthContext): JwtPayload {
  const user = requireAuth(context);
  if (user.role !== "TEACHER")
    throw new Error("Forbidden. Teacher access required.");
  return user;
}

export function requireStudent(context: AuthContext): JwtPayload {
  const user = requireAuth(context);
  if (user.role !== "STUDENT")
    throw new Error("Forbidden. Student access required.");
  return user;
}
