// app.js — main entry point

import {
  getStudents, getCourses, getSessions,
  getAttendanceSummary, getStudentStats,
  getEnrollmentsByStudent, getEnrollmentsByCourse,
  markAttendance, markAttendanceBulk,
  enrollStudent, unenrollStudent,
} from './api.js';

import { SubscriptionClient } from './subscription.js';

import {
  showResult, showError,
  setWsStatus, setSubButton,
  appendFeedEvent, appendFeedError,
  initTabs, renderStats, renderBulkResult,
} from './ui.js';

// ── Subscription client ───────────────────────────────────────────────────────

const subClient = new SubscriptionClient({
  onEvent:        appendFeedEvent,
  onStatusChange: (connected) => { setWsStatus(connected); setSubButton(subClient.active); },
  onError:        appendFeedError,
});

// ── Queries ───────────────────────────────────────────────────────────────────

async function handleFetchStudents() {
  try   { showResult('query-result', await getStudents()); }
  catch (e) { showError('query-result', e.message); }
}

async function handleFetchCourses() {
  try   { showResult('query-result', await getCourses()); }
  catch (e) { showError('query-result', e.message); }
}

async function handleFetchSessions() {
  try   { showResult('query-result', await getSessions()); }
  catch (e) { showError('query-result', e.message); }
}

async function handleFetchSummary() {
  const sessionId = document.getElementById('summarySessionId').value.trim();
  if (!sessionId) return alert('Enter a session ID first.');
  try   { showResult('query-result', await getAttendanceSummary(sessionId)); }
  catch (e) { showError('query-result', e.message); }
}

// ── Student Stats ─────────────────────────────────────────────────────────────

async function handleStudentStats() {
  const studentId = document.getElementById('stats-studentId').value.trim();
  if (!studentId) return alert('Enter a student ID.');
  try   { renderStats(await getStudentStats(studentId)); }
  catch (e) { showError('stats-result', e.message); }
}

// ── Mark Attendance ───────────────────────────────────────────────────────────

async function handleMarkAttendance() {
  const studentId = document.getElementById('mut-studentId').value.trim();
  const sessionId = document.getElementById('mut-sessionId').value.trim();
  const status    = document.getElementById('mut-status').value;
  if (!studentId || !sessionId) return alert('Fill in both IDs.');
  try   { showResult('mutation-result', await markAttendance(studentId, sessionId, status)); }
  catch (e) { showError('mutation-result', e.message); }
}

// ── Bulk Mark Attendance ──────────────────────────────────────────────────────

async function handleBulkMark() {
  const sessionId = document.getElementById('bulk-sessionId').value.trim();
  const raw       = document.getElementById('bulk-records').value.trim();
  if (!sessionId || !raw) return alert('Fill in session ID and records.');

  // Parse lines: "studentId,STATUS" one per line
  let records;
  try {
    records = raw.split('\n')
      .map(l => l.trim()).filter(Boolean)
      .map(line => {
        const [studentId, status = 'PRESENT'] = line.split(',').map(s => s.trim());
        return { studentId, status: status.toUpperCase() };
      });
  } catch {
    return alert('Invalid format. Use one "studentId,STATUS" per line.');
  }

  try   { renderBulkResult(await markAttendanceBulk(sessionId, records)); }
  catch (e) { showError('bulk-result', e.message); }
}

// ── Enrollment ────────────────────────────────────────────────────────────────

async function handleEnroll() {
  const studentId = document.getElementById('enroll-studentId').value.trim();
  const courseId  = document.getElementById('enroll-courseId').value.trim();
  if (!studentId || !courseId) return alert('Fill in both IDs.');
  try   { showResult('enroll-result', await enrollStudent(studentId, courseId)); }
  catch (e) { showError('enroll-result', e.message); }
}

async function handleUnenroll() {
  const studentId = document.getElementById('enroll-studentId').value.trim();
  const courseId  = document.getElementById('enroll-courseId').value.trim();
  if (!studentId || !courseId) return alert('Fill in both IDs.');
  try   { showResult('enroll-result', await unenrollStudent(studentId, courseId)); }
  catch (e) { showError('enroll-result', e.message); }
}

async function handleEnrollmentsByStudent() {
  const studentId = document.getElementById('enroll-studentId').value.trim();
  if (!studentId) return alert('Enter a student ID.');
  try   { showResult('enroll-result', await getEnrollmentsByStudent(studentId)); }
  catch (e) { showError('enroll-result', e.message); }
}

async function handleEnrollmentsByCourse() {
  const courseId = document.getElementById('enroll-courseId').value.trim();
  if (!courseId) return alert('Enter a course ID.');
  try   { showResult('enroll-result', await getEnrollmentsByCourse(courseId)); }
  catch (e) { showError('enroll-result', e.message); }
}

// ── Subscription ──────────────────────────────────────────────────────────────

function handleToggleSubscription() {
  const sessionId = document.getElementById('sub-sessionId').value.trim();
  subClient.toggle(sessionId || null);
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.getElementById('btn-students').addEventListener('click', handleFetchStudents);
document.getElementById('btn-courses').addEventListener('click', handleFetchCourses);
document.getElementById('btn-sessions').addEventListener('click', handleFetchSessions);
document.getElementById('btn-summary').addEventListener('click', handleFetchSummary);
document.getElementById('btn-stats').addEventListener('click', handleStudentStats);
document.getElementById('btn-mark').addEventListener('click', handleMarkAttendance);
document.getElementById('btn-bulk').addEventListener('click', handleBulkMark);
document.getElementById('btn-enroll').addEventListener('click', handleEnroll);
document.getElementById('btn-unenroll').addEventListener('click', handleUnenroll);
document.getElementById('btn-enrollments-student').addEventListener('click', handleEnrollmentsByStudent);
document.getElementById('btn-enrollments-course').addEventListener('click', handleEnrollmentsByCourse);
document.getElementById('sub-btn').addEventListener('click', handleToggleSubscription);

initTabs('.mutation-tabs');
