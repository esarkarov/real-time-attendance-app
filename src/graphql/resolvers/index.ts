import bcrypt from "bcryptjs";
import { withFilter } from "graphql-subscriptions";
import mongoose from "mongoose";
import { AttendanceRecord } from "../../models/AttendanceRecord";
import { Course } from "../../models/Course";
import { Enrollment } from "../../models/Enrollment";
import { Session } from "../../models/Session";
import { Student } from "../../models/Student";
import { User } from "../../models/User";
import {
  AuthContext,
  requireAuth,
  requireTeacher,
  signToken,
} from "../../utils/auth";
import { EVENTS, pubsub } from "../../utils/pubsub";

// ── Validation helpers ────────────────────────────────────────────────────────

function validateEmail(email: string): void {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) throw new Error(`Invalid email address: "${email}"`);
}

function validateFutureDate(date: Date): void {
  if (date <= new Date())
    throw new Error("Session date must be in the future.");
}

async function validateEnrollment(
  studentId: string,
  courseId: string,
): Promise<void> {
  const enrollment = await Enrollment.findOne({ studentId, courseId });
  if (!enrollment)
    throw new Error(
      "Student is not enrolled in this course. Enroll them first.",
    );
}

// ── Late threshold helper ─────────────────────────────────────────────────────

function resolveAttendanceStatus(
  session: { date: Date; lateThresholdMinutes: number },
  providedStatus?: string,
): "PRESENT" | "ABSENT" | "LATE" {
  // If teacher explicitly provides ABSENT, always respect it
  if (providedStatus === "ABSENT") return "ABSENT";

  const now = new Date();
  const sessionStart = new Date(session.date);
  const minutesLate = (now.getTime() - sessionStart.getTime()) / 60000;

  // Auto-detect LATE based on threshold
  if (minutesLate > session.lateThresholdMinutes) return "LATE";

  return "PRESENT";
}

// ── Types ─────────────────────────────────────────────────────────────────────

type PaginationArgs = { limit?: number; offset?: number };
type StatusType = "PRESENT" | "ABSENT" | "LATE";
type Context = AuthContext;

// ── Resolvers ─────────────────────────────────────────────────────────────────

export const resolvers = {
  // ── Field resolvers ────────────────────────────────────────────────────────

  Session: {
    course: async (parent: { courseId: mongoose.Types.ObjectId }) =>
      Course.findById(parent.courseId),
  },

  AttendanceRecord: {
    student: async (parent: { studentId: mongoose.Types.ObjectId }) =>
      Student.findById(parent.studentId),
    session: async (parent: { sessionId: mongoose.Types.ObjectId }) =>
      Session.findById(parent.sessionId),
  },

  AttendanceSummary: {
    session: async (parent: { sessionId: string }) =>
      Session.findById(parent.sessionId),
  },

  Enrollment: {
    student: async (parent: { studentId: mongoose.Types.ObjectId }) =>
      Student.findById(parent.studentId),
    course: async (parent: { courseId: mongoose.Types.ObjectId }) =>
      Course.findById(parent.courseId),
  },

  StudentStats: {
    student: async (parent: { studentId: string }) =>
      Student.findById(parent.studentId),
  },

  // ── Queries ────────────────────────────────────────────────────────────────

  Query: {
    me: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      return User.findById(userId);
    },

    students: async (
      _: unknown,
      { limit = 50, offset = 0 }: PaginationArgs,
      context: Context,
    ) => {
      requireTeacher(context);
      return Student.find().sort({ createdAt: -1 }).skip(offset).limit(limit);
    },

    student: async (_: unknown, { id }: { id: string }, context: Context) => {
      requireTeacher(context);
      return Student.findById(id);
    },

    courses: async (
      _: unknown,
      { limit = 50, offset = 0 }: PaginationArgs,
      context: Context,
    ) => {
      requireAuth(context);
      return Course.find().sort({ createdAt: -1 }).skip(offset).limit(limit);
    },

    course: async (_: unknown, { id }: { id: string }, context: Context) => {
      requireAuth(context);
      return Course.findById(id);
    },

    // Now supports filtering by status e.g. sessions(status: ONGOING)
    sessions: async (
      _: unknown,
      {
        courseId,
        status,
        limit = 50,
        offset = 0,
      }: { courseId?: string; status?: string } & PaginationArgs,
      context: Context,
    ) => {
      requireAuth(context);
      const filter: Record<string, unknown> = {};
      if (courseId) filter.courseId = courseId;
      if (status) filter.status = status;
      return Session.find(filter).sort({ date: -1 }).skip(offset).limit(limit);
    },

    session: async (_: unknown, { id }: { id: string }, context: Context) => {
      requireAuth(context);
      return Session.findById(id);
    },

    attendanceBySession: async (
      _: unknown,
      {
        sessionId,
        limit = 100,
        offset = 0,
      }: { sessionId: string } & PaginationArgs,
      context: Context,
    ) => {
      requireTeacher(context);
      const records = await AttendanceRecord.find({ sessionId })
        .sort({ markedAt: -1 })
        .skip(offset)
        .limit(limit);
      const all = await AttendanceRecord.find({ sessionId });
      return {
        sessionId,
        totalPresent: all.filter((r) => r.status === "PRESENT").length,
        totalAbsent: all.filter((r) => r.status === "ABSENT").length,
        totalLate: all.filter((r) => r.status === "LATE").length,
        records,
      };
    },

    attendanceByStudent: async (
      _: unknown,
      {
        studentId,
        limit = 50,
        offset = 0,
      }: { studentId: string } & PaginationArgs,
      context: Context,
    ) => {
      requireTeacher(context);
      return AttendanceRecord.find({ studentId })
        .sort({ markedAt: -1 })
        .skip(offset)
        .limit(limit);
    },

    myAttendance: async (
      _: unknown,
      { limit = 50, offset = 0 }: PaginationArgs,
      context: Context,
    ) => {
      const user = requireAuth(context);
      if (user.role !== "STUDENT")
        throw new Error("Only students can use myAttendance.");
      if (!user.studentId)
        throw new Error("No student profile linked to your account.");
      return AttendanceRecord.find({ studentId: user.studentId })
        .sort({ markedAt: -1 })
        .skip(offset)
        .limit(limit);
    },

    studentStats: async (
      _: unknown,
      { studentId }: { studentId: string },
      context: Context,
    ) => {
      const user = requireAuth(context);
      if (user.role === "STUDENT" && user.studentId !== studentId) {
        throw new Error("Students can only view their own stats.");
      }
      const records = await AttendanceRecord.find({ studentId });
      const present = records.filter((r) => r.status === "PRESENT").length;
      const absent = records.filter((r) => r.status === "ABSENT").length;
      const late = records.filter((r) => r.status === "LATE").length;
      const total = records.length;
      const attendanceRate =
        total > 0 ? Math.round(((present + late) / total) * 10000) / 100 : 0;
      return {
        studentId,
        totalSessions: total,
        present,
        absent,
        late,
        attendanceRate,
      };
    },

    enrollmentsByStudent: async (
      _: unknown,
      { studentId }: { studentId: string },
      context: Context,
    ) => {
      requireTeacher(context);
      return Enrollment.find({ studentId });
    },

    enrollmentsByCourse: async (
      _: unknown,
      { courseId }: { courseId: string },
      context: Context,
    ) => {
      requireTeacher(context);
      return Enrollment.find({ courseId });
    },
  },

  // ── Mutations ──────────────────────────────────────────────────────────────

  Mutation: {
    // ── Auth ───────────────────────────────────────────────────────────────

    register: async (
      _: unknown,
      args: {
        name: string;
        email: string;
        password: string;
        role: "TEACHER" | "STUDENT";
        studentId?: string;
      },
    ) => {
      validateEmail(args.email);
      const existing = await User.findOne({ email: args.email });
      if (existing) throw new Error("Email already registered.");
      if (args.role === "STUDENT" && !args.studentId) {
        throw new Error("studentId is required when registering as a STUDENT.");
      }
      const hashed = await bcrypt.hash(args.password, 12);
      const user = new User({
        name: args.name,
        email: args.email,
        password: hashed,
        role: args.role,
        studentId: args.studentId ?? null,
      });
      await user.save();
      return { token: signToken(user), user };
    },

    login: async (
      _: unknown,
      { email, password }: { email: string; password: string },
    ) => {
      const user = await User.findOne({ email });
      if (!user) throw new Error("Invalid email or password.");
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) throw new Error("Invalid email or password.");
      return { token: signToken(user), user };
    },

    // ── Students ───────────────────────────────────────────────────────────

    createStudent: async (
      _: unknown,
      args: { name: string; email: string; studentId: string },
      context: Context,
    ) => {
      requireTeacher(context);
      validateEmail(args.email);
      return new Student(args).save();
    },

    deleteStudent: async (
      _: unknown,
      { id }: { id: string },
      context: Context,
    ) => {
      requireTeacher(context);
      return !!(await Student.findByIdAndDelete(id));
    },

    // ── Courses ────────────────────────────────────────────────────────────

    createCourse: async (
      _: unknown,
      args: { name: string; code: string; instructor: string },
      context: Context,
    ) => {
      requireTeacher(context);
      return new Course(args).save();
    },

    deleteCourse: async (
      _: unknown,
      { id }: { id: string },
      context: Context,
    ) => {
      requireTeacher(context);
      return !!(await Course.findByIdAndDelete(id));
    },

    // ── Sessions ───────────────────────────────────────────────────────────

    createSession: async (
      _: unknown,
      args: {
        courseId: string;
        date: string;
        location: string;
        lateThresholdMinutes?: number;
      },
      context: Context,
    ) => {
      requireTeacher(context);
      const date = new Date(args.date);
      validateFutureDate(date);
      return new Session({
        courseId: args.courseId,
        date,
        location: args.location,
        lateThresholdMinutes: args.lateThresholdMinutes ?? 15,
        status: "UPCOMING",
      }).save();
    },

    deleteSession: async (
      _: unknown,
      { id }: { id: string },
      context: Context,
    ) => {
      requireTeacher(context);
      return !!(await Session.findByIdAndDelete(id));
    },

    // Feature: open session (UPCOMING → ONGOING)
    openSession: async (
      _: unknown,
      { id }: { id: string },
      context: Context,
    ) => {
      requireTeacher(context);
      const session = await Session.findById(id);
      if (!session) throw new Error("Session not found.");
      if (session.status === "CLOSED")
        throw new Error("Cannot reopen a closed session.");
      if (session.status === "ONGOING")
        throw new Error("Session is already open.");
      session.status = "ONGOING";
      return session.save();
    },

    // Feature: close session (ONGOING → CLOSED)
    closeSession: async (
      _: unknown,
      { id }: { id: string },
      context: Context,
    ) => {
      requireTeacher(context);
      const session = await Session.findById(id);
      if (!session) throw new Error("Session not found.");
      if (session.status === "UPCOMING")
        throw new Error("Session has not been opened yet.");
      if (session.status === "CLOSED")
        throw new Error("Session is already closed.");
      session.status = "CLOSED";
      return session.save();
    },

    // ── Attendance ─────────────────────────────────────────────────────────

    markAttendance: async (
      _: unknown,
      args: { studentId: string; sessionId: string; status?: StatusType },
      context: Context,
    ) => {
      requireTeacher(context);

      const session = await Session.findById(args.sessionId);
      if (!session) throw new Error("Session not found.");

      // Session must be ONGOING
      if (session.status !== "ONGOING") {
        throw new Error(
          `Cannot mark attendance. Session is ${session.status}. Open the session first.`,
        );
      }

      await validateEnrollment(args.studentId, session.courseId.toString());

      const existing = await AttendanceRecord.findOne({
        studentId: args.studentId,
        sessionId: args.sessionId,
      });
      if (existing)
        throw new Error(
          "Attendance already marked. Use updateAttendance instead.",
        );

      // Auto-detect LATE based on threshold if status not explicitly provided
      const status = resolveAttendanceStatus(session, args.status);

      const record = new AttendanceRecord({
        studentId: args.studentId,
        sessionId: args.sessionId,
        status,
        markedAt: new Date(),
      });
      await record.save();

      pubsub.publish(EVENTS.ATTENDANCE_MARKED, {
        attendanceMarked: record,
        sessionId: args.sessionId.toString(),
      });
      pubsub.publish(EVENTS.ATTENDANCE_UPDATED, { attendanceUpdated: record });

      return record;
    },

    updateAttendance: async (
      _: unknown,
      { id, status }: { id: string; status: StatusType },
      context: Context,
    ) => {
      requireTeacher(context);
      const record = await AttendanceRecord.findByIdAndUpdate(
        id,
        { status },
        { new: true },
      );
      if (!record) throw new Error("Attendance record not found.");
      pubsub.publish(EVENTS.ATTENDANCE_UPDATED, { attendanceUpdated: record });
      return record;
    },

    markAttendanceBulk: async (
      _: unknown,
      {
        sessionId,
        records,
      }: {
        sessionId: string;
        records: { studentId: string; status: StatusType }[];
      },
      context: Context,
    ) => {
      requireTeacher(context);
      const session = await Session.findById(sessionId);
      if (!session) throw new Error("Session not found.");

      // Session must be ONGOING
      if (session.status !== "ONGOING") {
        throw new Error(
          `Cannot mark attendance. Session is ${session.status}. Open the session first.`,
        );
      }

      const successful: (typeof AttendanceRecord.prototype)[] = [];
      const failed: { studentId: string; reason: string }[] = [];

      await Promise.all(
        records.map(async ({ studentId, status }) => {
          try {
            await validateEnrollment(studentId, session.courseId.toString());
            const existing = await AttendanceRecord.findOne({
              studentId,
              sessionId,
            });
            if (existing) {
              failed.push({ studentId, reason: "Attendance already marked." });
              return;
            }

            // Auto-detect LATE
            const resolvedStatus = resolveAttendanceStatus(session, status);
            const record = new AttendanceRecord({
              studentId,
              sessionId,
              status: resolvedStatus,
              markedAt: new Date(),
            });
            await record.save();

            pubsub.publish(EVENTS.ATTENDANCE_MARKED, {
              attendanceMarked: record,
              sessionId: sessionId.toString(),
            });
            pubsub.publish(EVENTS.ATTENDANCE_UPDATED, {
              attendanceUpdated: record,
            });
            successful.push(record);
          } catch (err: unknown) {
            failed.push({
              studentId,
              reason: err instanceof Error ? err.message : "Unknown error",
            });
          }
        }),
      );
      return { successful, failed };
    },

    // ── Enrollment ─────────────────────────────────────────────────────────

    enrollStudent: async (
      _: unknown,
      { studentId, courseId }: { studentId: string; courseId: string },
      context: Context,
    ) => {
      requireTeacher(context);
      if (!(await Student.findById(studentId)))
        throw new Error("Student not found.");
      if (!(await Course.findById(courseId)))
        throw new Error("Course not found.");
      if (await Enrollment.findOne({ studentId, courseId }))
        throw new Error("Student is already enrolled.");
      return new Enrollment({
        studentId,
        courseId,
        enrolledAt: new Date(),
      }).save();
    },

    unenrollStudent: async (
      _: unknown,
      { studentId, courseId }: { studentId: string; courseId: string },
      context: Context,
    ) => {
      requireTeacher(context);
      return !!(await Enrollment.findOneAndDelete({ studentId, courseId }));
    },
  },

  // ── Subscriptions ──────────────────────────────────────────────────────────

  Subscription: {
    attendanceMarked: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(EVENTS.ATTENDANCE_MARKED),
        (payload: { sessionId: string }, variables: { sessionId: string }) =>
          payload.sessionId.toString() === variables.sessionId.toString(),
      ),
      resolve: (payload: { attendanceMarked: unknown }) =>
        payload.attendanceMarked,
    },
    attendanceUpdated: {
      subscribe: () => pubsub.asyncIterator(EVENTS.ATTENDANCE_UPDATED),
      resolve: (payload: { attendanceUpdated: unknown }) =>
        payload.attendanceUpdated,
    },
  },
};
