import { withFilter } from "graphql-subscriptions";
import mongoose from "mongoose";
import { AttendanceRecord } from "../../models/AttendanceRecord";
import { Course } from "../../models/Course";
import { Enrollment } from "../../models/Enrollment";
import { Session } from "../../models/Session";
import { Student } from "../../models/Student";
import { EVENTS, pubsub } from "../../utils/pubsub";

// ── Feature 1: Validation helpers ────────────────────────────────────────────

function validateEmail(email: string): void {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) throw new Error(`Invalid email address: "${email}"`);
}

function validateFutureDate(date: Date): void {
  if (date <= new Date()) {
    throw new Error("Session date must be in the future.");
  }
}

async function validateEnrollment(
  studentId: string,
  courseId: string,
): Promise<void> {
  const enrollment = await Enrollment.findOne({ studentId, courseId });
  if (!enrollment) {
    throw new Error(
      `Student ${studentId} is not enrolled in this course. Enroll them first.`,
    );
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

type PaginationArgs = { limit?: number; offset?: number };
type StatusType = "PRESENT" | "ABSENT" | "LATE";

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
    // Feature 2: pagination on all list queries
    students: async (_: unknown, { limit = 50, offset = 0 }: PaginationArgs) =>
      Student.find().sort({ createdAt: -1 }).skip(offset).limit(limit),

    student: async (_: unknown, { id }: { id: string }) => Student.findById(id),

    courses: async (_: unknown, { limit = 50, offset = 0 }: PaginationArgs) =>
      Course.find().sort({ createdAt: -1 }).skip(offset).limit(limit),

    course: async (_: unknown, { id }: { id: string }) => Course.findById(id),

    sessions: async (
      _: unknown,
      {
        courseId,
        limit = 50,
        offset = 0,
      }: { courseId?: string } & PaginationArgs,
    ) => {
      const filter = courseId ? { courseId } : {};
      return Session.find(filter).sort({ date: -1 }).skip(offset).limit(limit);
    },

    session: async (_: unknown, { id }: { id: string }) => Session.findById(id),

    attendanceBySession: async (
      _: unknown,
      {
        sessionId,
        limit = 100,
        offset = 0,
      }: { sessionId: string } & PaginationArgs,
    ) => {
      const records = await AttendanceRecord.find({ sessionId })
        .sort({ markedAt: -1 })
        .skip(offset)
        .limit(limit);

      // Count totals across ALL records (not just paginated)
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
    ) =>
      AttendanceRecord.find({ studentId })
        .sort({ markedAt: -1 })
        .skip(offset)
        .limit(limit),

    // Feature 4: student attendance statistics
    studentStats: async (_: unknown, { studentId }: { studentId: string }) => {
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

    // Feature 5: enrollment queries
    enrollmentsByStudent: async (
      _: unknown,
      { studentId }: { studentId: string },
    ) => Enrollment.find({ studentId }),

    enrollmentsByCourse: async (
      _: unknown,
      { courseId }: { courseId: string },
    ) => Enrollment.find({ courseId }),
  },

  // ── Mutations ──────────────────────────────────────────────────────────────

  Mutation: {
    // Feature 1: email validation
    createStudent: async (
      _: unknown,
      args: { name: string; email: string; studentId: string },
    ) => {
      validateEmail(args.email);
      return new Student(args).save();
    },

    deleteStudent: async (_: unknown, { id }: { id: string }) => {
      const result = await Student.findByIdAndDelete(id);
      return !!result;
    },

    createCourse: async (
      _: unknown,
      args: { name: string; code: string; instructor: string },
    ) => new Course(args).save(),

    deleteCourse: async (_: unknown, { id }: { id: string }) => {
      const result = await Course.findByIdAndDelete(id);
      return !!result;
    },

    // Feature 1: future date validation
    createSession: async (
      _: unknown,
      args: { courseId: string; date: string; location: string },
    ) => {
      const date = new Date(args.date);
      validateFutureDate(date);
      return new Session({ ...args, date }).save();
    },

    deleteSession: async (_: unknown, { id }: { id: string }) => {
      const result = await Session.findByIdAndDelete(id);
      return !!result;
    },

    // Feature 1: validates enrollment before marking
    markAttendance: async (
      _: unknown,
      args: { studentId: string; sessionId: string; status: StatusType },
    ) => {
      // Check enrollment
      const session = await Session.findById(args.sessionId);
      if (!session) throw new Error("Session not found.");
      await validateEnrollment(args.studentId, session.courseId.toString());

      // Check duplicate
      const existing = await AttendanceRecord.findOne({
        studentId: args.studentId,
        sessionId: args.sessionId,
      });
      if (existing) {
        throw new Error(
          "Attendance already marked. Use updateAttendance instead.",
        );
      }

      const record = new AttendanceRecord({ ...args, markedAt: new Date() });
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
    ) => {
      const record = await AttendanceRecord.findByIdAndUpdate(
        id,
        { status },
        { new: true },
      );
      if (!record) throw new Error("Attendance record not found.");
      pubsub.publish(EVENTS.ATTENDANCE_UPDATED, { attendanceUpdated: record });
      return record;
    },

    // Feature 3: bulk mark attendance
    markAttendanceBulk: async (
      _: unknown,
      {
        sessionId,
        records,
      }: {
        sessionId: string;
        records: { studentId: string; status: StatusType }[];
      },
    ) => {
      const session = await Session.findById(sessionId);
      if (!session) throw new Error("Session not found.");

      const successful: (typeof AttendanceRecord.prototype)[] = [];
      const failed: { studentId: string; reason: string }[] = [];

      await Promise.all(
        records.map(async ({ studentId, status }) => {
          try {
            // Validate enrollment
            await validateEnrollment(studentId, session.courseId.toString());

            // Check duplicate
            const existing = await AttendanceRecord.findOne({
              studentId,
              sessionId,
            });
            if (existing) {
              failed.push({ studentId, reason: "Attendance already marked." });
              return;
            }

            const record = new AttendanceRecord({
              studentId,
              sessionId,
              status,
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

    // Feature 5: enrollment mutations
    enrollStudent: async (
      _: unknown,
      { studentId, courseId }: { studentId: string; courseId: string },
    ) => {
      const student = await Student.findById(studentId);
      if (!student) throw new Error("Student not found.");
      const course = await Course.findById(courseId);
      if (!course) throw new Error("Course not found.");

      const existing = await Enrollment.findOne({ studentId, courseId });
      if (existing)
        throw new Error("Student is already enrolled in this course.");

      return new Enrollment({
        studentId,
        courseId,
        enrolledAt: new Date(),
      }).save();
    },

    unenrollStudent: async (
      _: unknown,
      { studentId, courseId }: { studentId: string; courseId: string },
    ) => {
      const result = await Enrollment.findOneAndDelete({ studentId, courseId });
      return !!result;
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
