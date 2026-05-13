// app.js — main entry point

import {
  gql, setToken, clearToken, getToken,
  login, register, getMe,
  getStudents, getCourses, getSessions,
  getAttendanceSummary, getStudentStats, getMyAttendance,
  getEnrollmentsByStudent, getEnrollmentsByCourse,
  openSession, closeSession,
  markAttendance, markAttendanceBulk,
  enrollStudent, unenrollStudent,
  exportStats, exportSessionFile,
} from './api.js';

import { SubscriptionClient } from './subscription.js';

import {
  showResult, showError,
  setWsStatus, setSubButton,
  appendFeedEvent, appendFeedError,
  initTabs, renderStats, renderBulkResult,
  renderAuthUser, setAuthError,
  renderSessions, renderMyAttendance,
} from './ui.js';

// ── State ─────────────────────────────────────────────────────────────────────

let currentUser = null;

// ── Subscription client ───────────────────────────────────────────────────────

const subClient = new SubscriptionClient({
  onEvent:        appendFeedEvent,
  onStatusChange: (connected) => { setWsStatus(connected); setSubButton(subClient.active); },
  onError:        appendFeedError,
});

// ── Auth ──────────────────────────────────────────────────────────────────────

async function handleLogin() {
  const email    = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  if (!email || !password) return setAuthError('Fill in email and password.');
  try {
    setAuthError('');
    const data = await login(email, password);
    const { token, user } = data.data.login;
    setToken(token);
    currentUser = user;
    renderAuthUser(user);
  } catch (e) {
    setAuthError(e.message);
  }
}

async function handleRegister() {
  const name      = document.getElementById('reg-name').value.trim();
  const email     = document.getElementById('reg-email').value.trim();
  const password  = document.getElementById('reg-password').value;
  const role      = document.getElementById('reg-role').value;
  const studentId = document.getElementById('reg-studentId').value.trim();
  if (!name || !email || !password) return setAuthError('Fill in all fields.');
  try {
    setAuthError('');
    const data = await register(name, email, password, role, studentId || null);
    const { token, user } = data.data.register;
    setToken(token);
    currentUser = user;
    renderAuthUser(user);
  } catch (e) {
    setAuthError(e.message);
  }
}

function handleLogout() {
  clearToken();
  currentUser = null;
  renderAuthUser(null);
  subClient.stop();
}

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
  try   { renderSessions(await getSessions()); }
  catch (e) { showError('query-result', e.message); }
}

async function handleFetchSummary() {
  const sessionId = document.getElementById('summarySessionId').value.trim();
  if (!sessionId) return alert('Enter a session ID first.');
  try   { showResult('query-result', await getAttendanceSummary(sessionId)); }
  catch (e) { showError('query-result', e.message); }
}

async function handleStudentStats() {
  const studentId = document.getElementById('stats-studentId').value.trim();
  if (!studentId) return alert('Enter a student ID.');
  try   { renderStats(await getStudentStats(studentId)); }
  catch (e) { showError('stats-result', e.message); }
}

async function handleMyAttendance() {
  try   { renderMyAttendance(await getMyAttendance()); }
  catch (e) { showError('my-attendance-result', e.message); }
}

// ── Session management ────────────────────────────────────────────────────────

async function handleOpenSession(id) {
  try {
    await openSession(id);
    await handleFetchSessions(); // refresh
  } catch (e) { alert(`Error: ${e.message}`); }
}

async function handleCloseSession(id) {
  try {
    await closeSession(id);
    await handleFetchSessions(); // refresh
  } catch (e) { alert(`Error: ${e.message}`); }
}

// ── Mutations ─────────────────────────────────────────────────────────────────

async function handleMarkAttendance() {
  const studentId = document.getElementById('mut-studentId').value.trim();
  const sessionId = document.getElementById('mut-sessionId').value.trim();
  const status    = document.getElementById('mut-status').value;
  if (!studentId || !sessionId) return alert('Fill in both IDs.');
  try   { showResult('mutation-result', await markAttendance(studentId, sessionId, status || null)); }
  catch (e) { showError('mutation-result', e.message); }
}

async function handleBulkMark() {
  const sessionId = document.getElementById('bulk-sessionId').value.trim();
  const raw       = document.getElementById('bulk-records').value.trim();
  if (!sessionId || !raw) return alert('Fill in session ID and records.');
  try {
    const records = raw.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
      const [studentId, status = 'PRESENT'] = line.split(',').map(s => s.trim());
      return { studentId, status: status.toUpperCase() };
    });
    renderBulkResult(await markAttendanceBulk(sessionId, records));
  } catch (e) { showError('bulk-result', e.message); }
}

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

// ── Export ────────────────────────────────────────────────────────────────────

function handleExportStats() { exportStats(); }

function handleExportSession() {
  const sessionId = document.getElementById('export-sessionId').value.trim();
  if (!sessionId) return alert('Enter a session ID.');
  exportSessionFile(sessionId);
}

// ── Global event listeners (for dynamic buttons in session list) ──────────────

window.addEventListener('openSession',   e => handleOpenSession(e.detail));
window.addEventListener('closeSession',  e => handleCloseSession(e.detail));
window.addEventListener('exportSession', e => exportSessionFile(e.detail));
window.addEventListener('logout',        handleLogout);

// ── Auth tab switching ────────────────────────────────────────────────────────

function initAuthTabs() {
  const tabs = document.querySelectorAll('[data-auth-tab]');
  const panels = document.querySelectorAll('[data-auth-panel]');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('tab-active'));
      panels.forEach(p => p.classList.add('hidden'));
      tab.classList.add('tab-active');
      document.querySelector(`[data-auth-panel="${tab.dataset.authTab}"]`)?.classList.remove('hidden');
    });
  });
}

// ── Bind event listeners ──────────────────────────────────────────────────────

document.getElementById('btn-login').addEventListener('click', handleLogin);
document.getElementById('btn-register').addEventListener('click', handleRegister);
document.getElementById('btn-students').addEventListener('click', handleFetchStudents);
document.getElementById('btn-courses').addEventListener('click', handleFetchCourses);
document.getElementById('btn-sessions').addEventListener('click', handleFetchSessions);
document.getElementById('btn-summary').addEventListener('click', handleFetchSummary);
document.getElementById('btn-stats').addEventListener('click', handleStudentStats);
document.getElementById('btn-my-attendance').addEventListener('click', handleMyAttendance);
document.getElementById('btn-mark').addEventListener('click', handleMarkAttendance);
document.getElementById('btn-bulk').addEventListener('click', handleBulkMark);
document.getElementById('btn-enroll').addEventListener('click', handleEnroll);
document.getElementById('btn-unenroll').addEventListener('click', handleUnenroll);
document.getElementById('btn-enrollments-student').addEventListener('click', handleEnrollmentsByStudent);
document.getElementById('btn-enrollments-course').addEventListener('click', handleEnrollmentsByCourse);
document.getElementById('sub-btn').addEventListener('click', handleToggleSubscription);
document.getElementById('btn-export-stats').addEventListener('click', handleExportStats);
document.getElementById('btn-export-session').addEventListener('click', handleExportSession);

initTabs('.mutation-tabs');
initAuthTabs();
renderAuthUser(null); // start logged out
