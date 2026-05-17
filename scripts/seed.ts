import bcrypt from "bcryptjs";
import "dotenv/config";
import mongoose from "mongoose";
import { AttendanceLog } from "../src/models/AttendanceLog";
import { AttendanceRecord } from "../src/models/AttendanceRecord";
import { Course } from "../src/models/Course";
import { Enrollment } from "../src/models/Enrollment";
import { Session } from "../src/models/Session";
import { Student } from "../src/models/Student";
import { User } from "../src/models/User";

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not defined");

  await mongoose.connect(uri);
  console.log("✅ Connected to MongoDB");

  // ── Clear ALL collections ─────────────────────────────────────────────────
  await Promise.all([
    Student.deleteMany({}),
    Course.deleteMany({}),
    Session.deleteMany({}),
    AttendanceRecord.deleteMany({}),
    AttendanceLog.deleteMany({}),
    Enrollment.deleteMany({}),
    User.deleteMany({}),
  ]);
  console.log("🗑️  Cleared existing data");

  // ── Students ──────────────────────────────────────────────────────────────
  const students = await Student.insertMany([
    { name: "Elvin Sarkarov", email: "elvin@ufaz.az", studentId: "DSAI001" },
    { name: "Elbay Mammadov", email: "elbay@ufaz.az", studentId: "DSAI002" },
    { name: "Roza Huseynzada", email: "roza@ufaz.az", studentId: "DSAI003" },
    { name: "Ayla Hasanova", email: "ayla@ufaz.az", studentId: "DSAI004" },
    { name: "Murad Aliyev", email: "murad@ufaz.az", studentId: "DSAI005" },
    { name: "Leyla Ahmadova", email: "leyla@ufaz.az", studentId: "DSAI006" },
    { name: "Tural Hasanov", email: "tural@ufaz.az", studentId: "DSAI007" },
    { name: "Nigar Guliyeva", email: "nigar@ufaz.az", studentId: "DSAI008" },
  ]);
  console.log(`👤 Created ${students.length} students`);

  // ── Courses ───────────────────────────────────────────────────────────────
  const courses = await Course.insertMany([
    {
      name: "Distributed Programming",
      code: "PROG4",
      instructor: "Prof. Martin",
    },
    { name: "Machine Learning", code: "ML301", instructor: "Prof. Dupont" },
    { name: "Data Mining", code: "DM201", instructor: "Prof. Zhang" },
  ]);
  console.log(`📚 Created ${courses.length} courses`);

  // ── Enrollments ───────────────────────────────────────────────────────────
  const enrollmentData = [
    ...students.map((s) => ({ studentId: s._id, courseId: courses[0]._id })), // PROG4 — all 8
    ...students
      .slice(0, 5)
      .map((s) => ({ studentId: s._id, courseId: courses[1]._id })), // ML301 — first 5
    ...students
      .slice(0, 4)
      .map((s) => ({ studentId: s._id, courseId: courses[2]._id })), // DM201 — first 4
  ];
  await Enrollment.insertMany(
    enrollmentData.map((e) => ({ ...e, enrolledAt: new Date() })),
  );
  console.log(`🎓 Created ${enrollmentData.length} enrollments`);

  // ── Sessions ──────────────────────────────────────────────────────────────
  const sessions = await Session.insertMany([
    // PROG4 — 3 closed past sessions
    {
      courseId: courses[0]._id,
      date: new Date("2026-04-14T09:00:00"),
      location: "Room A101",
      status: "CLOSED",
      lateThresholdMinutes: 15,
    },
    {
      courseId: courses[0]._id,
      date: new Date("2026-04-21T09:00:00"),
      location: "Room A101",
      status: "CLOSED",
      lateThresholdMinutes: 15,
    },
    {
      courseId: courses[0]._id,
      date: new Date("2026-04-28T09:00:00"),
      location: "Room A101",
      status: "CLOSED",
      lateThresholdMinutes: 15,
    },
    // ML301 — 2 closed past sessions
    {
      courseId: courses[1]._id,
      date: new Date("2026-04-15T11:00:00"),
      location: "Lab B202",
      status: "CLOSED",
      lateThresholdMinutes: 10,
    },
    {
      courseId: courses[1]._id,
      date: new Date("2026-04-22T11:00:00"),
      location: "Lab B202",
      status: "CLOSED",
      lateThresholdMinutes: 10,
    },
    // DM201 — 2 closed past sessions
    {
      courseId: courses[2]._id,
      date: new Date("2026-04-16T14:00:00"),
      location: "Room C303",
      status: "CLOSED",
      lateThresholdMinutes: 20,
    },
    {
      courseId: courses[2]._id,
      date: new Date("2026-04-23T14:00:00"),
      location: "Room C303",
      status: "CLOSED",
      lateThresholdMinutes: 20,
    },
    // Upcoming sessions for testing
    {
      courseId: courses[0]._id,
      date: new Date("2026-05-20T09:00:00"),
      location: "Room A101",
      status: "UPCOMING",
      lateThresholdMinutes: 15,
    },
    {
      courseId: courses[1]._id,
      date: new Date("2026-05-21T11:00:00"),
      location: "Lab B202",
      status: "UPCOMING",
      lateThresholdMinutes: 10,
    },
    {
      courseId: courses[2]._id,
      date: new Date("2026-05-22T14:00:00"),
      location: "Room C303",
      status: "UPCOMING",
      lateThresholdMinutes: 20,
    },
  ]);
  console.log(`📅 Created ${sessions.length} sessions`);

  // ── Attendance Records ────────────────────────────────────────────────────
  const [s0, s1, s2, s3, s4, s5, s6] = sessions;

  const attendanceData = [
    // PROG4 Session 1
    { studentId: students[0]._id, sessionId: s0._id, status: "PRESENT" },
    { studentId: students[1]._id, sessionId: s0._id, status: "PRESENT" },
    { studentId: students[2]._id, sessionId: s0._id, status: "LATE" },
    { studentId: students[3]._id, sessionId: s0._id, status: "ABSENT" },
    { studentId: students[4]._id, sessionId: s0._id, status: "PRESENT" },
    { studentId: students[5]._id, sessionId: s0._id, status: "PRESENT" },
    { studentId: students[6]._id, sessionId: s0._id, status: "LATE" },
    { studentId: students[7]._id, sessionId: s0._id, status: "PRESENT" },
    // PROG4 Session 2
    { studentId: students[0]._id, sessionId: s1._id, status: "PRESENT" },
    { studentId: students[1]._id, sessionId: s1._id, status: "ABSENT" },
    { studentId: students[2]._id, sessionId: s1._id, status: "PRESENT" },
    { studentId: students[3]._id, sessionId: s1._id, status: "PRESENT" },
    { studentId: students[4]._id, sessionId: s1._id, status: "LATE" },
    { studentId: students[5]._id, sessionId: s1._id, status: "PRESENT" },
    { studentId: students[6]._id, sessionId: s1._id, status: "ABSENT" },
    { studentId: students[7]._id, sessionId: s1._id, status: "PRESENT" },
    // PROG4 Session 3
    { studentId: students[0]._id, sessionId: s2._id, status: "PRESENT" },
    { studentId: students[1]._id, sessionId: s2._id, status: "PRESENT" },
    { studentId: students[2]._id, sessionId: s2._id, status: "PRESENT" },
    { studentId: students[3]._id, sessionId: s2._id, status: "LATE" },
    { studentId: students[4]._id, sessionId: s2._id, status: "ABSENT" },
    { studentId: students[5]._id, sessionId: s2._id, status: "PRESENT" },
    { studentId: students[6]._id, sessionId: s2._id, status: "PRESENT" },
    { studentId: students[7]._id, sessionId: s2._id, status: "LATE" },
    // ML301 Session 1
    { studentId: students[0]._id, sessionId: s3._id, status: "PRESENT" },
    { studentId: students[1]._id, sessionId: s3._id, status: "LATE" },
    { studentId: students[2]._id, sessionId: s3._id, status: "PRESENT" },
    { studentId: students[3]._id, sessionId: s3._id, status: "ABSENT" },
    { studentId: students[4]._id, sessionId: s3._id, status: "PRESENT" },
    // ML301 Session 2
    { studentId: students[0]._id, sessionId: s4._id, status: "PRESENT" },
    { studentId: students[1]._id, sessionId: s4._id, status: "PRESENT" },
    { studentId: students[2]._id, sessionId: s4._id, status: "ABSENT" },
    { studentId: students[3]._id, sessionId: s4._id, status: "PRESENT" },
    { studentId: students[4]._id, sessionId: s4._id, status: "LATE" },
    // DM201 Session 1
    { studentId: students[0]._id, sessionId: s5._id, status: "PRESENT" },
    { studentId: students[1]._id, sessionId: s5._id, status: "PRESENT" },
    { studentId: students[2]._id, sessionId: s5._id, status: "LATE" },
    { studentId: students[3]._id, sessionId: s5._id, status: "ABSENT" },
    // DM201 Session 2
    { studentId: students[0]._id, sessionId: s6._id, status: "PRESENT" },
    { studentId: students[1]._id, sessionId: s6._id, status: "ABSENT" },
    { studentId: students[2]._id, sessionId: s6._id, status: "PRESENT" },
    { studentId: students[3]._id, sessionId: s6._id, status: "PRESENT" },
  ];

  await AttendanceRecord.insertMany(
    attendanceData.map((r) => ({ ...r, markedAt: new Date() })),
  );
  console.log(`📝 Created ${attendanceData.length} attendance records`);

  // ── Users (pre-seeded accounts) ───────────────────────────────────────────
  const hashedPassword = await bcrypt.hash("password123", 12);

  await User.insertMany([
    // Teacher account
    {
      name: "Prof. Martin",
      email: "martin@ufaz.az",
      password: hashedPassword,
      role: "TEACHER",
      studentId: null,
    },
    // Student accounts linked to student records
    {
      name: students[0].name,
      email: students[0].email,
      password: hashedPassword,
      role: "STUDENT",
      studentId: students[0]._id,
    },
    {
      name: students[1].name,
      email: students[1].email,
      password: hashedPassword,
      role: "STUDENT",
      studentId: students[1]._id,
    },
    {
      name: students[2].name,
      email: students[2].email,
      password: hashedPassword,
      role: "STUDENT",
      studentId: students[2]._id,
    },
  ]);
  console.log("🔐 Created 4 user accounts (1 teacher + 3 students)");

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ Seed complete!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n🔐 Login credentials (password: password123):");
  console.log("  TEACHER  →  martin@ufaz.az");
  console.log("  STUDENT  →  elvin@ufaz.az");
  console.log("  STUDENT  →  elbay@ufaz.az");
  console.log("  STUDENT  →  roza@ufaz.az");
  console.log("\n📚 Courses:");
  courses.forEach((c) => console.log(`  ${c.code.padEnd(6)}  →  ${c._id}`));
  console.log("\n👤 Students:");
  students.forEach((s) =>
    console.log(`  ${s.studentId}  ${s.name.padEnd(18)}  →  ${s._id}`),
  );
  console.log("\n📅 Sessions:");
  sessions.forEach((s, i) => {
    const course = courses.find((c) => c._id.equals(s.courseId));
    console.log(
      `  [${i}] ${course?.code.padEnd(6)}  ${s.date.toISOString().slice(0, 10)}  ${s.status.padEnd(8)}  ${s.location.padEnd(12)}  →  ${s._id}`,
    );
  });
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
