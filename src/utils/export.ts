import ExcelJS from "exceljs";
import { Response } from "express";
import { AttendanceRecord } from "../models/AttendanceRecord";
import { Course } from "../models/Course";
import { Enrollment } from "../models/Enrollment";
import { Session } from "../models/Session";
import { Student } from "../models/Student";

// ── Styles ────────────────────────────────────────────────────────────────────

const COLORS = {
  header: "1E3A5F",
  present: "D4EDDA",
  absent: "F8D7DA",
  late: "FFF3CD",
  subhead: "D6E4F0",
  border: "BFBFBF",
};

function applyHeaderStyle(cell: ExcelJS.Cell, bgColor = COLORS.header) {
  cell.font = {
    bold: true,
    color: { argb: bgColor === COLORS.header ? "FFFFFF" : "000000" },
    size: 11,
  };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.border = {
    top: { style: "thin", color: { argb: COLORS.border } },
    bottom: { style: "thin", color: { argb: COLORS.border } },
    left: { style: "thin", color: { argb: COLORS.border } },
    right: { style: "thin", color: { argb: COLORS.border } },
  };
}

function applyDataStyle(cell: ExcelJS.Cell, bgColor?: string) {
  if (bgColor) {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: bgColor },
    };
  }
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.border = {
    top: { style: "thin", color: { argb: COLORS.border } },
    bottom: { style: "thin", color: { argb: COLORS.border } },
    left: { style: "thin", color: { argb: COLORS.border } },
    right: { style: "thin", color: { argb: COLORS.border } },
  };
}

function statusColor(status: string): string | undefined {
  if (status === "PRESENT") return COLORS.present;
  if (status === "ABSENT") return COLORS.absent;
  if (status === "LATE") return COLORS.late;
  return undefined;
}

// ── Export 1: Session Attendance Sheet ───────────────────────────────────────

export async function exportSessionAttendance(
  sessionId: string,
  res: Response,
) {
  const session = await Session.findById(sessionId).populate("courseId");
  if (!session) throw new Error("Session not found.");

  const course = await Course.findById(session.courseId);
  const records = await AttendanceRecord.find({ sessionId }).sort({
    markedAt: 1,
  });
  const recordMap = new Map(records.map((r) => [r.studentId.toString(), r]));

  // Get all enrolled students for this course
  const enrollments = await Enrollment.find({ courseId: session.courseId });
  const studentIds = enrollments.map((e) => e.studentId);
  const students = await Student.find({ _id: { $in: studentIds } }).sort({
    name: 1,
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Real-time Attendance System";
  wb.created = new Date();

  const ws = wb.addWorksheet("Attendance");

  // ── Title block ────────────────────────────────────────────────────────────
  ws.mergeCells("A1:F1");
  const titleCell = ws.getCell("A1");
  titleCell.value = "REAL-TIME ATTENDANCE SYSTEM";
  titleCell.font = { bold: true, size: 14, color: { argb: "FFFFFF" } };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLORS.header },
  };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 30;

  ws.mergeCells("A2:F2");
  const subCell = ws.getCell("A2");
  subCell.value = `Session Attendance Report`;
  subCell.font = { bold: true, size: 11 };
  subCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLORS.subhead },
  };
  subCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(2).height = 20;

  // ── Meta info ──────────────────────────────────────────────────────────────
  const meta = [
    ["Course", `${course?.name} (${course?.code})`],
    ["Instructor", course?.instructor ?? "-"],
    [
      "Date",
      new Date(session.date).toLocaleDateString("en-GB", { dateStyle: "full" }),
    ],
    ["Location", session.location],
    ["Status", session.status],
    ["Generated", new Date().toLocaleString()],
  ];

  meta.forEach(([label, value], i) => {
    const row = ws.getRow(3 + i);
    row.getCell(1).value = label;
    row.getCell(1).font = { bold: true };
    row.getCell(2).value = value;
    ws.mergeCells(`B${3 + i}:F${3 + i}`);
  });

  const dataStartRow = 10;

  // ── Summary row ────────────────────────────────────────────────────────────
  const present = records.filter((r) => r.status === "PRESENT").length;
  const absent = records.filter((r) => r.status === "ABSENT").length;
  const late = records.filter((r) => r.status === "LATE").length;
  const total = students.length;

  ws.getRow(dataStartRow - 1).values = [
    "",
    `Total: ${total}`,
    `Present: ${present}`,
    `Absent: ${absent}`,
    `Late: ${late}`,
    `Rate: ${total > 0 ? Math.round(((present + late) / total) * 100) : 0}%`,
  ];
  ws.getRow(dataStartRow - 1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: COLORS.header } };
  });

  // ── Table header ───────────────────────────────────────────────────────────
  const headerRow = ws.getRow(dataStartRow);
  headerRow.values = [
    "#",
    "Student ID",
    "Name",
    "Email",
    "Status",
    "Marked At",
  ];
  headerRow.eachCell((cell) => applyHeaderStyle(cell));
  headerRow.height = 22;

  // ── Data rows ──────────────────────────────────────────────────────────────
  students.forEach((student, i) => {
    const record = recordMap.get(student._id.toString());
    const status = record?.status ?? "NOT MARKED";
    const markedAt = record
      ? new Date(record.markedAt).toLocaleTimeString()
      : "-";

    const row = ws.getRow(dataStartRow + 1 + i);
    row.values = [
      i + 1,
      student.studentId,
      student.name,
      student.email,
      status,
      markedAt,
    ];
    const color = statusColor(status);
    row.eachCell((cell) => applyDataStyle(cell, color));
    row.height = 18;
  });

  // ── Column widths ──────────────────────────────────────────────────────────
  ws.columns = [
    { width: 5 },
    { width: 12 },
    { width: 22 },
    { width: 28 },
    { width: 14 },
    { width: 16 },
  ];

  // ── Send response ──────────────────────────────────────────────────────────
  const filename = `attendance_${course?.code}_${new Date(session.date).toISOString().slice(0, 10)}.xlsx`;
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  await wb.xlsx.write(res);
  res.end();
}

// ── Export 2: Student Stats Report ───────────────────────────────────────────

export async function exportStudentStats(res: Response) {
  const students = await Student.find().sort({ name: 1 });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Real-time Attendance System";
  wb.created = new Date();

  const ws = wb.addWorksheet("Student Stats");

  // ── Title ──────────────────────────────────────────────────────────────────
  ws.mergeCells("A1:G1");
  const titleCell = ws.getCell("A1");
  titleCell.value = "REAL-TIME ATTENDANCE SYSTEM";
  titleCell.font = { bold: true, size: 14, color: { argb: "FFFFFF" } };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLORS.header },
  };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 30;

  ws.mergeCells("A2:G2");
  const subCell = ws.getCell("A2");
  subCell.value = `Student Attendance Statistics — Generated: ${new Date().toLocaleString()}`;
  subCell.font = { bold: true, size: 10 };
  subCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLORS.subhead },
  };
  subCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(2).height = 18;

  // ── Table header ───────────────────────────────────────────────────────────
  const headerRow = ws.getRow(4);
  headerRow.values = [
    "#",
    "Student ID",
    "Name",
    "Email",
    "Present",
    "Absent",
    "Late",
    "Total",
    "Rate (%)",
  ];
  headerRow.eachCell((cell) => applyHeaderStyle(cell));
  headerRow.height = 22;

  // ── Data rows ──────────────────────────────────────────────────────────────
  let totalPresent = 0,
    totalAbsent = 0,
    totalLate = 0;

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const records = await AttendanceRecord.find({ studentId: student._id });
    const present = records.filter((r) => r.status === "PRESENT").length;
    const absent = records.filter((r) => r.status === "ABSENT").length;
    const late = records.filter((r) => r.status === "LATE").length;
    const total = records.length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

    totalPresent += present;
    totalAbsent += absent;
    totalLate += late;

    const row = ws.getRow(5 + i);
    row.values = [
      i + 1,
      student.studentId,
      student.name,
      student.email,
      present,
      absent,
      late,
      total,
      `${rate}%`,
    ];

    // Color the rate cell
    const rateCell = row.getCell(9);
    rateCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb:
          rate >= 75
            ? COLORS.present
            : rate >= 50
              ? COLORS.late
              : COLORS.absent,
      },
    };

    row.eachCell((cell) => applyDataStyle(cell));
    row.height = 18;
  }

  // ── Totals row ─────────────────────────────────────────────────────────────
  const totalsRow = ws.getRow(5 + students.length + 1);
  totalsRow.values = [
    "",
    "",
    "TOTALS",
    "",
    totalPresent,
    totalAbsent,
    totalLate,
    totalPresent + totalAbsent + totalLate,
    "",
  ];
  totalsRow.eachCell((cell) => {
    cell.font = { bold: true };
    applyDataStyle(cell, COLORS.subhead);
  });

  // ── Column widths ──────────────────────────────────────────────────────────
  ws.columns = [
    { width: 5 },
    { width: 12 },
    { width: 22 },
    { width: 28 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 12 },
  ];

  const filename = `student_stats_${new Date().toISOString().slice(0, 10)}.xlsx`;
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  await wb.xlsx.write(res);
  res.end();
}
