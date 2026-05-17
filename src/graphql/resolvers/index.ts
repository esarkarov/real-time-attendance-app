import bcrypt from "bcryptjs";
import { withFilter } from "graphql-subscriptions";
import mongoose from "mongoose";
import { AttendanceLog } from "../../models/AttendanceLog";
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

function validateEmail(email: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error(`Invalid email: "${email}"`);
}

function validateFutureDate(date: Date) {
  if (date <= new Date())
    throw new Error("Session date must be in the future.");
}

async function validateEnrollment(studentId: string, courseId: string) {
  const e = await Enrollment.findOne({ studentId, courseId });
  if (!e) throw new Error("Student is not enrolled in this course.");
}

function resolveStatus(
  session: { date: Date; lateThresholdMinutes: number },
  provided?: string,
) {
  if (provided === "ABSENT") return "ABSENT";
  const late = (Date.now() - new Date(session.date).getTime()) / 60000;
  return late > session.lateThresholdMinutes ? "LATE" : "PRESENT";
}

type PA = { limit?: number; offset?: number };
type ST = "PRESENT" | "ABSENT" | "LATE";
type CTX = AuthContext;

export const resolvers = {
  Session: {
    course: async (p: { courseId: mongoose.Types.ObjectId }) =>
      Course.findById(p.courseId).exec(),
  },
  AttendanceRecord: {
    student: async (p: { studentId: mongoose.Types.ObjectId }) =>
      Student.findById(p.studentId).exec(),
    session: async (p: { sessionId: mongoose.Types.ObjectId }) =>
      Session.findById(p.sessionId).exec(),
  },
  AttendanceSummary: {
    session: async (p: { sessionId: string }) =>
      Session.findById(p.sessionId).exec(),
  },
  AttendanceLog: {
    changedBy: async (p: { changedBy: mongoose.Types.ObjectId }) =>
      User.findById(p.changedBy).exec(),
  },
  Enrollment: {
    student: async (p: { studentId: mongoose.Types.ObjectId }) =>
      Student.findById(p.studentId).exec(),
    course: async (p: { courseId: mongoose.Types.ObjectId }) =>
      Course.findById(p.courseId).exec(),
  },
  StudentStats: {
    student: async (p: { studentId: string }) =>
      Student.findById(p.studentId).exec(),
  },

  Query: {
    me: async (_: unknown, __: unknown, ctx: CTX) => {
      const { userId } = requireAuth(ctx);
      return User.findById(userId).exec();
    },

    dashboardStats: async (_: unknown, __: unknown, ctx: CTX) => {
      requireAuth(ctx);
      const [
        totalStudents,
        totalCourses,
        totalSessions,
        ongoingSessions,
        totalAttendanceRecords,
        allRecords,
      ] = await Promise.all([
        Student.countDocuments(),
        Course.countDocuments(),
        Session.countDocuments(),
        Session.countDocuments({ status: "ONGOING" }),
        AttendanceRecord.countDocuments(),
        AttendanceRecord.find({}, { status: 1 }).exec(),
      ]);
      const present = allRecords.filter((r) => r.status === "PRESENT").length;
      const late = allRecords.filter((r) => r.status === "LATE").length;
      const overallAttendanceRate =
        totalAttendanceRecords > 0
          ? Math.round(((present + late) / totalAttendanceRecords) * 10000) /
            100
          : 0;
      return {
        totalStudents,
        totalCourses,
        totalSessions,
        ongoingSessions,
        totalAttendanceRecords,
        overallAttendanceRate,
      };
    },

    students: async (_: unknown, { limit = 50, offset = 0 }: PA, ctx: CTX) => {
      requireTeacher(ctx);
      return Student.find()
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .exec();
    },
    student: async (_: unknown, { id }: { id: string }, ctx: CTX) => {
      requireTeacher(ctx);
      return Student.findById(id).exec();
    },

    courses: async (_: unknown, { limit = 50, offset = 0 }: PA, ctx: CTX) => {
      requireAuth(ctx);
      return Course.find()
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .exec();
    },
    course: async (_: unknown, { id }: { id: string }, ctx: CTX) => {
      requireAuth(ctx);
      return Course.findById(id).exec();
    },

    sessions: async (
      _: unknown,
      {
        courseId,
        status,
        limit = 50,
        offset = 0,
      }: { courseId?: string; status?: string } & PA,
      ctx: CTX,
    ) => {
      requireAuth(ctx);
      const f: Record<string, unknown> = {};
      if (courseId) f.courseId = courseId;
      if (status) f.status = status;
      return Session.find(f)
        .sort({ date: -1 })
        .skip(offset)
        .limit(limit)
        .exec();
    },
    session: async (_: unknown, { id }: { id: string }, ctx: CTX) => {
      requireAuth(ctx);
      return Session.findById(id).exec();
    },

    attendanceBySession: async (
      _: unknown,
      { sessionId, limit = 100, offset = 0 }: { sessionId: string } & PA,
      ctx: CTX,
    ) => {
      requireTeacher(ctx);
      const [records, all] = await Promise.all([
        AttendanceRecord.find({ sessionId })
          .sort({ markedAt: -1 })
          .skip(offset)
          .limit(limit)
          .exec(),
        AttendanceRecord.find({ sessionId }).exec(),
      ]);
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
      { studentId, limit = 50, offset = 0 }: { studentId: string } & PA,
      ctx: CTX,
    ) => {
      requireTeacher(ctx);
      return AttendanceRecord.find({ studentId })
        .sort({ markedAt: -1 })
        .skip(offset)
        .limit(limit)
        .exec();
    },

    myAttendance: async (
      _: unknown,
      { limit = 50, offset = 0 }: PA,
      ctx: CTX,
    ) => {
      const user = requireAuth(ctx);
      if (user.role !== "STUDENT") throw new Error("Students only.");
      if (!user.studentId) throw new Error("No student profile linked.");
      return AttendanceRecord.find({ studentId: user.studentId })
        .sort({ markedAt: -1 })
        .skip(offset)
        .limit(limit)
        .exec();
    },

    attendanceLogs: async (
      _: unknown,
      { attendanceRecordId }: { attendanceRecordId: string },
      ctx: CTX,
    ) => {
      requireTeacher(ctx);
      return AttendanceLog.find({ attendanceRecordId })
        .sort({ changedAt: -1 })
        .exec();
    },

    studentStats: async (
      _: unknown,
      { studentId }: { studentId: string },
      ctx: CTX,
    ) => {
      const user = requireAuth(ctx);
      if (user.role === "STUDENT" && user.studentId !== studentId)
        throw new Error("Students can only view own stats.");
      const records = await AttendanceRecord.find({ studentId }).exec();
      const present = records.filter((r) => r.status === "PRESENT").length;
      const absent = records.filter((r) => r.status === "ABSENT").length;
      const late = records.filter((r) => r.status === "LATE").length;
      const total = records.length;
      return {
        studentId,
        totalSessions: total,
        present,
        absent,
        late,
        attendanceRate:
          total > 0 ? Math.round(((present + late) / total) * 10000) / 100 : 0,
      };
    },

    enrollmentsByStudent: async (
      _: unknown,
      { studentId }: { studentId: string },
      ctx: CTX,
    ) => {
      requireTeacher(ctx);
      return Enrollment.find({ studentId }).exec();
    },
    enrollmentsByCourse: async (
      _: unknown,
      { courseId }: { courseId: string },
      ctx: CTX,
    ) => {
      requireTeacher(ctx);
      return Enrollment.find({ courseId }).exec();
    },
  },

  Mutation: {
    // ── Auth ─────────────────────────────────────────────────────────────────
    // Only teachers register here. Students are created by teachers via createStudent.

    register: async (
      _: unknown,
      args: { name: string; email: string; password: string },
    ) => {
      validateEmail(args.email);
      if (await User.findOne({ email: args.email }))
        throw new Error("Email already registered.");
      if (args.password.length < 6)
        throw new Error("Password must be at least 6 characters.");
      const user = await new User({
        name: args.name,
        email: args.email,
        password: await bcrypt.hash(args.password, 12),
        role: "TEACHER",
        studentId: null,
      }).save();
      return { token: signToken(user), user };
    },

    login: async (
      _: unknown,
      { email, password }: { email: string; password: string },
    ) => {
      const user = await User.findOne({ email });
      if (!user || !(await bcrypt.compare(password, user.password)))
        throw new Error("Invalid email or password.");
      return { token: signToken(user), user };
    },

    changePassword: async (
      _: unknown,
      {
        oldPassword,
        newPassword,
      }: { oldPassword: string; newPassword: string },
      ctx: CTX,
    ) => {
      const { userId } = requireAuth(ctx);
      const user = await User.findById(userId);
      if (!user) throw new Error("User not found.");
      if (!(await bcrypt.compare(oldPassword, user.password)))
        throw new Error("Old password is incorrect.");
      if (newPassword.length < 6)
        throw new Error("New password must be at least 6 characters.");
      user.password = await bcrypt.hash(newPassword, 12);
      await user.save();
      return true;
    },

    // ── Students ──────────────────────────────────────────────────────────────
    // Teacher creates student record AND their login account in one step.

    createStudent: async (
      _: unknown,
      args: {
        name: string;
        email: string;
        studentId: string;
        password: string;
      },
      ctx: CTX,
    ) => {
      requireTeacher(ctx);
      validateEmail(args.email);
      if (!args.password || args.password.length < 6)
        throw new Error("Password must be at least 6 characters.");

      // Check for duplicates
      if (await Student.findOne({ email: args.email }))
        throw new Error("A student with this email already exists.");
      if (await Student.findOne({ studentId: args.studentId }))
        throw new Error("A student with this ID already exists.");

      // Create student record
      const student = await new Student({
        name: args.name,
        email: args.email,
        studentId: args.studentId,
      }).save();

      // Create their login account
      if (!(await User.findOne({ email: args.email }))) {
        await new User({
          name: args.name,
          email: args.email,
          password: await bcrypt.hash(args.password, 12),
          role: "STUDENT",
          studentId: student._id,
        }).save();
      }

      return student;
    },

    updateStudent: async (
      _: unknown,
      {
        id,
        ...updates
      }: { id: string; name?: string; email?: string; studentId?: string },
      ctx: CTX,
    ) => {
      requireTeacher(ctx);
      if (updates.email) validateEmail(updates.email);
      const student = await Student.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true },
      );
      if (!student) throw new Error("Student not found.");
      return student;
    },

    deleteStudent: async (_: unknown, { id }: { id: string }, ctx: CTX) => {
      requireTeacher(ctx);
      const student = await Student.findById(id);
      if (student) {
        // Also delete their user account
        await User.findOneAndDelete({ email: student.email });
      }
      return !!(await Student.findByIdAndDelete(id));
    },

    createCourse: async (
      _: unknown,
      args: { name: string; code: string; instructor: string },
      ctx: CTX,
    ) => {
      requireTeacher(ctx);
      return new Course(args).save();
    },

    updateCourse: async (
      _: unknown,
      {
        id,
        ...updates
      }: { id: string; name?: string; code?: string; instructor?: string },
      ctx: CTX,
    ) => {
      requireTeacher(ctx);
      const course = await Course.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true },
      );
      if (!course) throw new Error("Course not found.");
      return course;
    },

    deleteCourse: async (_: unknown, { id }: { id: string }, ctx: CTX) => {
      requireTeacher(ctx);
      return !!(await Course.findByIdAndDelete(id));
    },

    createSession: async (
      _: unknown,
      args: {
        courseId: string;
        date: string;
        location: string;
        lateThresholdMinutes?: number;
      },
      ctx: CTX,
    ) => {
      requireTeacher(ctx);
      const date = new Date(args.date);
      validateFutureDate(date);
      return new Session({
        ...args,
        date,
        lateThresholdMinutes: args.lateThresholdMinutes ?? 15,
        status: "UPCOMING",
      }).save();
    },

    deleteSession: async (_: unknown, { id }: { id: string }, ctx: CTX) => {
      requireTeacher(ctx);
      return !!(await Session.findByIdAndDelete(id));
    },

    openSession: async (_: unknown, { id }: { id: string }, ctx: CTX) => {
      requireTeacher(ctx);
      const s = await Session.findById(id);
      if (!s) throw new Error("Session not found.");
      if (s.status === "CLOSED")
        throw new Error("Cannot reopen a closed session.");
      if (s.status === "ONGOING") throw new Error("Session already open.");
      s.status = "ONGOING";
      return s.save();
    },

    closeSession: async (_: unknown, { id }: { id: string }, ctx: CTX) => {
      requireTeacher(ctx);
      const s = await Session.findById(id);
      if (!s) throw new Error("Session not found.");
      if (s.status === "UPCOMING") throw new Error("Session not opened yet.");
      if (s.status === "CLOSED") throw new Error("Session already closed.");
      s.status = "CLOSED";
      return s.save();
    },

    markAttendance: async (
      _: unknown,
      args: { studentId: string; sessionId: string; status?: ST },
      ctx: CTX,
    ) => {
      requireTeacher(ctx);
      const session = await Session.findById(args.sessionId);
      if (!session) throw new Error("Session not found.");
      if (session.status !== "ONGOING")
        throw new Error(`Session is ${session.status}. Open it first.`);
      await validateEnrollment(args.studentId, session.courseId.toString());
      if (
        await AttendanceRecord.findOne({
          studentId: args.studentId,
          sessionId: args.sessionId,
        })
      )
        throw new Error(
          "Attendance already marked. Use updateAttendance instead.",
        );
      const status = resolveStatus(session, args.status) as ST;
      const record = await new AttendanceRecord({
        studentId: args.studentId,
        sessionId: args.sessionId,
        status,
        markedAt: new Date(),
      }).save();
      pubsub.publish(EVENTS.ATTENDANCE_MARKED, {
        attendanceMarked: record,
        sessionId: args.sessionId.toString(),
      });
      pubsub.publish(EVENTS.ATTENDANCE_UPDATED, { attendanceUpdated: record });
      return record;
    },

    updateAttendance: async (
      _: unknown,
      { id, status }: { id: string; status: ST },
      ctx: CTX,
    ) => {
      const { userId } = requireTeacher(ctx);
      const record = await AttendanceRecord.findById(id);
      if (!record) throw new Error("Attendance record not found.");
      await new AttendanceLog({
        attendanceRecordId: record._id,
        changedBy: userId,
        previousStatus: record.status,
        newStatus: status,
        changedAt: new Date(),
      }).save();
      record.status = status;
      await record.save();
      pubsub.publish(EVENTS.ATTENDANCE_UPDATED, { attendanceUpdated: record });
      return record;
    },

    markAttendanceBulk: async (
      _: unknown,
      {
        sessionId,
        records,
      }: { sessionId: string; records: { studentId: string; status: ST }[] },
      ctx: CTX,
    ) => {
      requireTeacher(ctx);
      const session = await Session.findById(sessionId);
      if (!session) throw new Error("Session not found.");
      if (session.status !== "ONGOING")
        throw new Error(`Session is ${session.status}. Open it first.`);
      const successful: (typeof AttendanceRecord.prototype)[] = [];
      const failed: { studentId: string; reason: string }[] = [];
      await Promise.all(
        records.map(async ({ studentId, status }) => {
          try {
            await validateEnrollment(studentId, session.courseId.toString());
            if (await AttendanceRecord.findOne({ studentId, sessionId })) {
              failed.push({ studentId, reason: "Already marked." });
              return;
            }
            const resolved = resolveStatus(session, status) as ST;
            const record = await new AttendanceRecord({
              studentId,
              sessionId,
              status: resolved,
              markedAt: new Date(),
            }).save();
            pubsub.publish(EVENTS.ATTENDANCE_MARKED, {
              attendanceMarked: record,
              sessionId: sessionId.toString(),
            });
            pubsub.publish(EVENTS.ATTENDANCE_UPDATED, {
              attendanceUpdated: record,
            });
            successful.push(record);
          } catch (err) {
            failed.push({
              studentId,
              reason: err instanceof Error ? err.message : "Unknown error",
            });
          }
        }),
      );
      return { successful, failed };
    },

    enrollStudent: async (
      _: unknown,
      { studentId, courseId }: { studentId: string; courseId: string },
      ctx: CTX,
    ) => {
      requireTeacher(ctx);
      if (!(await Student.findById(studentId)))
        throw new Error("Student not found.");
      if (!(await Course.findById(courseId)))
        throw new Error("Course not found.");
      if (await Enrollment.findOne({ studentId, courseId }))
        throw new Error("Already enrolled.");
      return new Enrollment({
        studentId,
        courseId,
        enrolledAt: new Date(),
      }).save();
    },

    unenrollStudent: async (
      _: unknown,
      { studentId, courseId }: { studentId: string; courseId: string },
      ctx: CTX,
    ) => {
      requireTeacher(ctx);
      return !!(await Enrollment.findOneAndDelete({ studentId, courseId }));
    },
  },

  Subscription: {
    attendanceMarked: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(EVENTS.ATTENDANCE_MARKED),
        (p: { sessionId: string }, v: { sessionId: string }) =>
          p.sessionId.toString() === v.sessionId.toString(),
      ),
      resolve: (p: { attendanceMarked: unknown }) => p.attendanceMarked,
    },
    attendanceUpdated: {
      subscribe: () => pubsub.asyncIterator(EVENTS.ATTENDANCE_UPDATED),
      resolve: (p: { attendanceUpdated: unknown }) => p.attendanceUpdated,
    },
  },
};
