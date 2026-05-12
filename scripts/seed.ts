import "dotenv/config";
import mongoose from "mongoose";
import { AttendanceRecord } from "../src/models/AttendanceRecord";
import { Course } from "../src/models/Course";
import { Enrollment } from "../src/models/Enrollment";
import { Session } from "../src/models/Session";
import { Student } from "../src/models/Student";

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not defined");

  await mongoose.connect(uri);
  console.log("✅ Connected to MongoDB");

  // Clear ALL collections
  await Promise.all([
    Student.deleteMany({}),
    Course.deleteMany({}),
    Session.deleteMany({}),
    AttendanceRecord.deleteMany({}),
    Enrollment.deleteMany({}),
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
    // Distributed Programming — all 8 students
    ...students.map((s) => ({ studentId: s._id, courseId: courses[0]._id })),
    // Machine Learning — first 5
    ...students
      .slice(0, 5)
      .map((s) => ({ studentId: s._id, courseId: courses[1]._id })),
    // Data Mining — first 4
    ...students
      .slice(0, 4)
      .map((s) => ({ studentId: s._id, courseId: courses[2]._id })),
  ];

  await Enrollment.insertMany(
    enrollmentData.map((e) => ({ ...e, enrolledAt: new Date() })),
  );
  console.log(`🎓 Created ${enrollmentData.length} enrollments`);

  // ── Sessions ──────────────────────────────────────────────────────────────

  const sessions = await Session.insertMany([
    // Distributed Programming — 3 past sessions
    {
      courseId: courses[0]._id,
      date: new Date("2026-04-14T09:00:00"),
      location: "Room A101",
    },
    {
      courseId: courses[0]._id,
      date: new Date("2026-04-21T09:00:00"),
      location: "Room A101",
    },
    {
      courseId: courses[0]._id,
      date: new Date("2026-04-28T09:00:00"),
      location: "Room A101",
    },
    // Machine Learning — 2 past sessions
    {
      courseId: courses[1]._id,
      date: new Date("2026-04-15T11:00:00"),
      location: "Lab B202",
    },
    {
      courseId: courses[1]._id,
      date: new Date("2026-04-22T11:00:00"),
      location: "Lab B202",
    },
    // Data Mining — 2 past sessions
    {
      courseId: courses[2]._id,
      date: new Date("2026-04-16T14:00:00"),
      location: "Room C303",
    },
    {
      courseId: courses[2]._id,
      date: new Date("2026-04-23T14:00:00"),
      location: "Room C303",
    },
  ]);
  console.log(`📅 Created ${sessions.length} sessions`);

  // ── Attendance Records ────────────────────────────────────────────────────

  const prog4s0 = sessions[0]; // PROG4 session 1
  const prog4s1 = sessions[1]; // PROG4 session 2
  const prog4s2 = sessions[2]; // PROG4 session 3
  const ml301s0 = sessions[3]; // ML301 session 1
  const ml301s1 = sessions[4]; // ML301 session 2
  const dm201s0 = sessions[5]; // DM201 session 1
  const dm201s1 = sessions[6]; // DM201 session 2

  const attendanceData = [
    // ── PROG4 Session 1 (all 8 enrolled)
    { studentId: students[0]._id, sessionId: prog4s0._id, status: "PRESENT" },
    { studentId: students[1]._id, sessionId: prog4s0._id, status: "PRESENT" },
    { studentId: students[2]._id, sessionId: prog4s0._id, status: "LATE" },
    { studentId: students[3]._id, sessionId: prog4s0._id, status: "ABSENT" },
    { studentId: students[4]._id, sessionId: prog4s0._id, status: "PRESENT" },
    { studentId: students[5]._id, sessionId: prog4s0._id, status: "PRESENT" },
    { studentId: students[6]._id, sessionId: prog4s0._id, status: "LATE" },
    { studentId: students[7]._id, sessionId: prog4s0._id, status: "PRESENT" },

    // ── PROG4 Session 2
    { studentId: students[0]._id, sessionId: prog4s1._id, status: "PRESENT" },
    { studentId: students[1]._id, sessionId: prog4s1._id, status: "ABSENT" },
    { studentId: students[2]._id, sessionId: prog4s1._id, status: "PRESENT" },
    { studentId: students[3]._id, sessionId: prog4s1._id, status: "PRESENT" },
    { studentId: students[4]._id, sessionId: prog4s1._id, status: "LATE" },
    { studentId: students[5]._id, sessionId: prog4s1._id, status: "PRESENT" },
    { studentId: students[6]._id, sessionId: prog4s1._id, status: "ABSENT" },
    { studentId: students[7]._id, sessionId: prog4s1._id, status: "PRESENT" },

    // ── PROG4 Session 3
    { studentId: students[0]._id, sessionId: prog4s2._id, status: "PRESENT" },
    { studentId: students[1]._id, sessionId: prog4s2._id, status: "PRESENT" },
    { studentId: students[2]._id, sessionId: prog4s2._id, status: "PRESENT" },
    { studentId: students[3]._id, sessionId: prog4s2._id, status: "LATE" },
    { studentId: students[4]._id, sessionId: prog4s2._id, status: "ABSENT" },
    { studentId: students[5]._id, sessionId: prog4s2._id, status: "PRESENT" },
    { studentId: students[6]._id, sessionId: prog4s2._id, status: "PRESENT" },
    { studentId: students[7]._id, sessionId: prog4s2._id, status: "LATE" },

    // ── ML301 Session 1 (first 5 enrolled)
    { studentId: students[0]._id, sessionId: ml301s0._id, status: "PRESENT" },
    { studentId: students[1]._id, sessionId: ml301s0._id, status: "LATE" },
    { studentId: students[2]._id, sessionId: ml301s0._id, status: "PRESENT" },
    { studentId: students[3]._id, sessionId: ml301s0._id, status: "ABSENT" },
    { studentId: students[4]._id, sessionId: ml301s0._id, status: "PRESENT" },

    // ── ML301 Session 2
    { studentId: students[0]._id, sessionId: ml301s1._id, status: "PRESENT" },
    { studentId: students[1]._id, sessionId: ml301s1._id, status: "PRESENT" },
    { studentId: students[2]._id, sessionId: ml301s1._id, status: "ABSENT" },
    { studentId: students[3]._id, sessionId: ml301s1._id, status: "PRESENT" },
    { studentId: students[4]._id, sessionId: ml301s1._id, status: "LATE" },

    // ── DM201 Session 1 (first 4 enrolled)
    { studentId: students[0]._id, sessionId: dm201s0._id, status: "PRESENT" },
    { studentId: students[1]._id, sessionId: dm201s0._id, status: "PRESENT" },
    { studentId: students[2]._id, sessionId: dm201s0._id, status: "LATE" },
    { studentId: students[3]._id, sessionId: dm201s0._id, status: "ABSENT" },

    // ── DM201 Session 2
    { studentId: students[0]._id, sessionId: dm201s1._id, status: "PRESENT" },
    { studentId: students[1]._id, sessionId: dm201s1._id, status: "ABSENT" },
    { studentId: students[2]._id, sessionId: dm201s1._id, status: "PRESENT" },
    { studentId: students[3]._id, sessionId: dm201s1._id, status: "PRESENT" },
  ];

  await AttendanceRecord.insertMany(
    attendanceData.map((r) => ({ ...r, markedAt: new Date() })),
  );
  console.log(`📝 Created ${attendanceData.length} attendance records`);

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ Seed complete! Quick reference:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n📚 Courses:");
  courses.forEach((c) => console.log(`  ${c.code}  →  ${c._id}`));
  console.log("\n👤 Students:");
  students.forEach((s) =>
    console.log(`  ${s.studentId}  ${s.name.padEnd(18)}  →  ${s._id}`),
  );
  console.log("\n📅 Sessions:");
  sessions.forEach((s, i) => {
    const course = courses.find((c) => c._id.equals(s.courseId));
    console.log(
      `  [${i}] ${course?.code}  ${s.date.toISOString().slice(0, 10)}  ${s.location.padEnd(12)}  →  ${s._id}`,
    );
  });
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
