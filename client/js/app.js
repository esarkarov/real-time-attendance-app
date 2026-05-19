// app.js — main entry point

import {
  setToken,
  clearToken,
  login,
  register,
  getStudents,
  getCourses,
  getSessions,
  getAttendanceSummary,
  getStudentStats,
  getMyAttendance,
  getEnrollmentsByStudent,
  getEnrollmentsByCourse,
  createStudent,
  createCourse,
  createSession,
  openSession,
  closeSession,
  markAttendance,
  markAttendanceBulk,
  enrollStudent,
  unenrollStudent,
  deleteStudent,
  deleteCourse,
  deleteSession,
  exportStats,
  exportSessionFile,
} from "./api.js";

import { SubscriptionClient } from "./subscription.js";
import { toast } from "./toast.js";

import {
  showAuthScreen,
  showApp,
  setAuthError,
  navigateTo,
  setLoading,
  renderDashboard,
  renderStudents,
  renderCourses,
  renderSessions,
  renderAttendanceSummary,
  renderStudentStats,
  renderMyAttendance,
  renderBulkResult,
  renderEnrollments,
  appendFeedEvent,
  appendFeedError,
  setWsStatus,
  setSubButton,
} from "./ui.js";

// ── State ─────────────────────────────────────────────────────────────────────

let currentUser = null;

// expose for inline HTML toast calls
window.showToastInfo = (msg) => toast.info(msg);

// ── Subscription ──────────────────────────────────────────────────────────────

const subClient = new SubscriptionClient({
  onEvent: appendFeedEvent,
  onStatusChange: (on) => {
    setWsStatus(on);
    setSubButton(subClient.active);
  },
  onError: appendFeedError,
});

// ── Auth ──────────────────────────────────────────────────────────────────────

async function handleLogin() {
  const email = v("auth-email");
  const password = v("auth-password");
  if (!email || !password) return setAuthError("Enter email and password.");
  setLoading("btn-login", true);
  try {
    setAuthError("");
    const data = await login(email, password);
    const { token, user } = data.data.login;
    setToken(token);
    currentUser = user;
    showApp(user);
    navigateTo("dashboard");
    loadDashboard();
    toast.success(`Welcome back, ${user.name}!`);
  } catch (e) {
    setAuthError(e.message);
  } finally {
    setLoading("btn-login", false);
  }
}

async function handleRegister() {
  const name = v("reg-name");
  const email = v("reg-email");
  const password = v("reg-password");
  const role = v("reg-role");

  if (!name || !email || !password)
    return setAuthError("Fill in all required fields.", "register");
  setLoading("btn-register", true);
  try {
    setAuthError("", "register");
    const data = await register(name, email, password, role);
    const { token, user } = data.data.register;
    setToken(token);
    currentUser = user;
    showApp(user);
    navigateTo("dashboard");
    loadDashboard();
    toast.success(`Account created! Welcome, ${user.name}!`);
  } catch (e) {
    setAuthError(e.message, "register");
  } finally {
    setLoading("btn-register", false);
  }
}

function handleLogout() {
  clearToken();
  currentUser = null;
  subClient.stop();
  showAuthScreen();
  toast.info("Logged out.");
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

async function loadDashboard() {
  try {
    const [students, sessions] = await Promise.all([
      currentUser.role === "TEACHER" ? getStudents() : Promise.resolve(null),
      getSessions(),
    ]);
    renderDashboard(students, sessions, null);

    // session count for student dashboard too
    const total = sessions?.data?.sessions?.length ?? 0;
    document.getElementById("dash-sessions").textContent = total;
    if (currentUser.role === "TEACHER") {
      document.getElementById("dash-students").textContent =
        students?.data?.students?.length ?? 0;
    }
  } catch (e) {
    toast.error(e.message);
  }
}

// ── Students ──────────────────────────────────────────────────────────────────

async function loadStudents() {
  setLoading("btn-refresh-students", true);
  try {
    renderStudents(
      await getStudents(),
      handleDeleteStudent,
      handleViewStudentStats,
    );
  } catch (e) {
    toast.error(e.message);
  } finally {
    setLoading("btn-refresh-students", false);
  }
}

async function handleCreateStudent() {
  const name = v("new-student-name");
  const email = v("new-student-email");
  const studentId = v("new-student-id");
  const password = v("new-student-password");
  if (!name || !email || !studentId || !password)
    return toast.error(
      "Fill in all student fields including the initial password.",
    );
  setLoading("btn-create-student", true);
  try {
    await createStudent(name, email, studentId, password);
    clear(
      "new-student-name",
      "new-student-email",
      "new-student-id",
      "new-student-password",
    );
    toast.success(`Student "${name}" created with login account.`);
    loadStudents();
  } catch (e) {
    toast.error(e.message);
  } finally {
    setLoading("btn-create-student", false);
  }
}

async function handleViewStudentStats(id) {
  navigateTo("stats");
  document.getElementById("stats-student-id").value = id;
  await handleFetchStats();
}

async function handleDeleteStudent(id) {
  if (!confirm("Delete this student?")) return;
  try {
    await deleteStudent(id);
    toast.success("Student deleted.");
    loadStudents();
  } catch (e) {
    toast.error(e.message);
  }
}

// ── Courses ───────────────────────────────────────────────────────────────────

async function loadCourses() {
  setLoading("btn-refresh-courses", true);
  try {
    renderCourses(await getCourses(), handleDeleteCourse);
  } catch (e) {
    toast.error(e.message);
  } finally {
    setLoading("btn-refresh-courses", false);
  }
}

async function handleCreateCourse() {
  const name = v("new-course-name");
  const code = v("new-course-code");
  const instructor = v("new-course-instructor");
  if (!name || !code || !instructor)
    return toast.error("Fill in all course fields.");
  setLoading("btn-create-course", true);
  try {
    await createCourse(name, code, instructor);
    clear("new-course-name", "new-course-code", "new-course-instructor");
    toast.success(`Course "${name}" created.`);
    loadCourses();
  } catch (e) {
    toast.error(e.message);
  } finally {
    setLoading("btn-create-course", false);
  }
}

async function handleDeleteCourse(id) {
  if (!confirm("Delete this course?")) return;
  try {
    await deleteCourse(id);
    toast.success("Course deleted.");
    loadCourses();
  } catch (e) {
    toast.error(e.message);
  }
}

// ── Sessions ──────────────────────────────────────────────────────────────────

async function loadSessions() {
  setLoading("btn-refresh-sessions", true);
  try {
    renderSessions(await getSessions(), {
      onOpen: handleOpenSession,
      onClose: handleCloseSession,
      onExport: (id) =>
        exportSessionFile(id).catch((e) => toast.error(e.message)),
      onDelete: handleDeleteSession,
      onViewSummary: handleViewSummary,
    });
  } catch (e) {
    toast.error(e.message);
  } finally {
    setLoading("btn-refresh-sessions", false);
  }
}

async function handleCreateSession() {
  const courseId = v("new-session-course");
  const date = v("new-session-date");
  const location = v("new-session-location");
  const threshold = parseInt(v("new-session-threshold")) || 15;
  if (!courseId || !date || !location)
    return toast.error("Fill in all session fields.");
  setLoading("btn-create-session", true);
  try {
    await createSession(courseId, date, location, threshold);
    clear("new-session-date", "new-session-location");
    toast.success("Session created.");
    loadSessions();
  } catch (e) {
    toast.error(e.message);
  } finally {
    setLoading("btn-create-session", false);
  }
}

async function handleOpenSession(id) {
  try {
    await openSession(id);
    toast.success("Session opened.");
    loadSessions();
  } catch (e) {
    toast.error(e.message);
  }
}

async function handleCloseSession(id) {
  try {
    await closeSession(id);
    toast.success("Session closed.");
    loadSessions();
  } catch (e) {
    toast.error(e.message);
  }
}

async function handleDeleteSession(id) {
  if (!confirm("Delete this session?")) return;
  try {
    await deleteSession(id);
    toast.success("Session deleted.");
    loadSessions();
  } catch (e) {
    toast.error(e.message);
  }
}

// ── Attendance ────────────────────────────────────────────────────────────────

async function handleViewSummary(sessionId) {
  navigateTo("attendance");
  document.getElementById("summary-session-id").value = sessionId;
  await handleFetchSummary();
}

async function handleFetchSummary() {
  const sessionId = v("summary-session-id");
  if (!sessionId) return toast.error("Please select a session.");
  setLoading("btn-fetch-summary", true);
  try {
    renderAttendanceSummary(await getAttendanceSummary(sessionId));
  } catch (e) {
    toast.error(e.message);
  } finally {
    setLoading("btn-fetch-summary", false);
  }
}

async function handleMarkAttendance() {
  const studentId = v("mark-student-id");
  const sessionId = v("mark-session-id");
  const status = v("mark-status");
  if (!studentId || !sessionId)
    return toast.error("Please select a session and student.");
  setLoading("btn-mark", true);
  try {
    await markAttendance(studentId, sessionId, status || null);
    toast.success("Attendance marked!");
    clear("mark-student-id");
  } catch (e) {
    toast.error(e.message);
  } finally {
    setLoading("btn-mark", false);
  }
}

async function handleBulkMark() {
  const sessionId = v("bulk-session-id");
  const raw = v("bulk-records");
  if (!sessionId || !raw)
    return toast.error("Please select a session and enter records.");
  setLoading("btn-bulk", true);
  try {
    const records = raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const [studentId, status = "PRESENT"] = line
          .split(",")
          .map((s) => s.trim());
        return { studentId, status: status.toUpperCase() };
      });
    renderBulkResult(await markAttendanceBulk(sessionId, records));
    toast.success("Bulk mark complete.");
  } catch (e) {
    toast.error(e.message);
  } finally {
    setLoading("btn-bulk", false);
  }
}

// ── Stats ─────────────────────────────────────────────────────────────────────

async function handleFetchStats() {
  const studentId = v("stats-student-id");
  if (!studentId) return toast.error("Please select a student.");
  setLoading("btn-fetch-stats", true);
  try {
    renderStudentStats(await getStudentStats(studentId));
  } catch (e) {
    toast.error(e.message);
  } finally {
    setLoading("btn-fetch-stats", false);
  }
}

// ── My Attendance (student) ───────────────────────────────────────────────────

async function loadMyAttendance() {
  setLoading("btn-load-my-attendance", true);
  try {
    renderMyAttendance(await getMyAttendance());
  } catch (e) {
    toast.error(e.message);
  } finally {
    setLoading("btn-load-my-attendance", false);
  }
}

// ── Enrollment ────────────────────────────────────────────────────────────────

async function handleEnroll() {
  const studentId = v("enroll-student-id");
  const courseId = v("enroll-course-id");
  if (!studentId || !courseId) return toast.error("Enter both IDs.");
  setLoading("btn-enroll", true);
  try {
    await enrollStudent(studentId, courseId);
    toast.success("Student enrolled.");
  } catch (e) {
    toast.error(e.message);
  } finally {
    setLoading("btn-enroll", false);
  }
}

async function handleUnenroll() {
  const studentId = v("enroll-student-id");
  const courseId = v("enroll-course-id");
  if (!studentId || !courseId) return toast.error("Enter both IDs.");
  if (!confirm("Remove enrollment?")) return;
  setLoading("btn-unenroll", true);
  try {
    await unenrollStudent(studentId, courseId);
    toast.success("Student unenrolled.");
  } catch (e) {
    toast.error(e.message);
  } finally {
    setLoading("btn-unenroll", false);
  }
}

async function handleEnrollmentsByStudent() {
  const studentId = v("enroll-student-id");
  if (!studentId) return toast.error("Please select a student.");
  try {
    renderEnrollments(await getEnrollmentsByStudent(studentId), "student");
  } catch (e) {
    toast.error(e.message);
  }
}

async function handleEnrollmentsByCourse() {
  const courseId = v("enroll-course-id");
  if (!courseId) return toast.error("Enter a course ID.");
  try {
    renderEnrollments(await getEnrollmentsByCourse(courseId), "course");
  } catch (e) {
    toast.error(e.message);
  }
}

// ── Subscription ──────────────────────────────────────────────────────────────

function handleToggleSub() {
  const sessionId = v("sub-session-id");
  subClient.toggle(sessionId || null);
}

// ── Export ────────────────────────────────────────────────────────────────────

async function handleExportStats() {
  try {
    await exportStats();
    toast.success("Downloading stats...");
  } catch (e) {
    toast.error(e.message);
  }
}

async function handleExportSession() {
  const sessionId = v("export-session-id");
  if (!sessionId) return toast.error("Please select a session.");
  try {
    await exportSessionFile(sessionId);
    toast.success("Downloading...");
  } catch (e) {
    toast.error(e.message);
  }
}

// ── Populate course select ────────────────────────────────────────────────────

async function populateCourseSelect() {
  try {
    const data = await getCourses();
    const courses = data?.data?.courses ?? [];
    const select = document.getElementById("new-session-course");
    if (!select) return;
    select.innerHTML =
      `<option value="">Select course...</option>` +
      courses
        .map((c) => `<option value="${c.id}">${c.code} — ${c.name}</option>`)
        .join("");
  } catch {}
}

async function populateDropdowns() {
  try {
    const [studentsData, coursesData, sessionsData] = await Promise.all([
      getStudents(),
      getCourses(),
      getSessions(),
    ]);
    const students = studentsData?.data?.students ?? [];
    const courses = coursesData?.data?.courses ?? [];
    const sessions = sessionsData?.data?.sessions ?? [];
    const ongoing = sessions.filter((s) => s.status === "ONGOING");
    const allSess = sessions;

    // ── Enrollment dropdowns ──────────────────────────────────────────────────
    const enrollStudent = document.getElementById("enroll-student-id");
    const enrollCourse = document.getElementById("enroll-course-id");
    if (enrollStudent) {
      enrollStudent.innerHTML =
        `<option value="">Select a student...</option>` +
        students
          .map(
            (s) =>
              `<option value="${s.id}">${s.name} (${s.studentId})</option>`,
          )
          .join("");
    }
    if (enrollCourse) {
      enrollCourse.innerHTML =
        `<option value="">Select a course...</option>` +
        courses
          .map((c) => `<option value="${c.id}">${c.code} — ${c.name}</option>`)
          .join("");
    }

    // ── Mark Attendance — session (ONGOING only) ──────────────────────────────
    const markSession = document.getElementById("mark-session-id");
    if (markSession) {
      markSession.innerHTML = ongoing.length
        ? `<option value="">Select an ongoing session...</option>` +
          ongoing
            .map(
              (s) =>
                `<option value="${s.id}">${s.course.code} — ${new Date(parseInt(s.date)).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} @ ${s.location}</option>`,
            )
            .join("")
        : `<option value="">No ongoing sessions</option>`;
      // When session changes, populate students enrolled in that course
      markSession.addEventListener("change", async () => {
        await populateMarkStudents(markSession.value, ongoing);
      });
    }

    // ── Bulk Mark — session (ONGOING only) ───────────────────────────────────
    const bulkSession = document.getElementById("bulk-session-id");
    if (bulkSession) {
      bulkSession.innerHTML = ongoing.length
        ? `<option value="">Select an ongoing session...</option>` +
          ongoing
            .map(
              (s) =>
                `<option value="${s.id}">${s.course.code} — ${new Date(parseInt(s.date)).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} @ ${s.location}</option>`,
            )
            .join("")
        : `<option value="">No ongoing sessions</option>`;
    }

    // ── Summary — all sessions ────────────────────────────────────────────────
    const summarySession = document.getElementById("summary-session-id");
    if (summarySession) {
      summarySession.innerHTML =
        `<option value="">Select a session...</option>` +
        allSess
          .map(
            (s) =>
              `<option value="${s.id}">[${s.status}] ${s.course.code} — ${new Date(parseInt(s.date)).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} @ ${s.location}</option>`,
          )
          .join("");
    }

    // ── Export — all sessions ─────────────────────────────────────────────────
    const exportSession = document.getElementById("export-session-id");
    if (exportSession) {
      exportSession.innerHTML =
        `<option value="">Select a session...</option>` +
        allSess
          .map(
            (s) =>
              `<option value="${s.id}">[${s.status}] ${s.course.code} — ${new Date(parseInt(s.date)).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</option>`,
          )
          .join("");
    }

    // ── Stats — all students ──────────────────────────────────────────────────
    const statsStudent = document.getElementById("stats-student-id");
    if (statsStudent) {
      statsStudent.innerHTML =
        `<option value="">Select a student...</option>` +
        students
          .map(
            (s) =>
              `<option value="${s.id}">${s.name} (${s.studentId})</option>`,
          )
          .join("");
    }
  } catch (e) {
    console.error("Failed to populate dropdowns:", e);
  }
}

async function populateMarkStudents(sessionId, ongoingSessions) {
  const markStudent = document.getElementById("mark-student-id");
  if (!markStudent) return;
  if (!sessionId) {
    markStudent.innerHTML = `<option value="">Select session first...</option>`;
    return;
  }
  try {
    const session = ongoingSessions.find((s) => s.id === sessionId);
    if (!session) return;
    const data = await getEnrollmentsByCourse(session.course.id);
    const enrollments = data?.data?.enrollmentsByCourse ?? [];
    markStudent.innerHTML = enrollments.length
      ? `<option value="">Select a student...</option>` +
        enrollments
          .map(
            (e) =>
              `<option value="${e.student.id}">${e.student.name} (${e.student.studentId})</option>`,
          )
          .join("")
      : `<option value="">No enrolled students</option>`;
  } catch {
    markStudent.innerHTML = `<option value="">Failed to load students</option>`;
  }
}

// ── Navigation setup ──────────────────────────────────────────────────────────

function setupNav() {
  document.querySelectorAll("[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = btn.dataset.page;
      navigateTo(page);
      // Lazy load data on nav
      if (page === "students") loadStudents();
      if (page === "courses") loadCourses();
      if (page === "sessions") {
        loadSessions();
        populateCourseSelect();
        populateDropdowns();
      }
      if (page === "my-attendance") loadMyAttendance();
      if (page === "attendance") populateDropdowns();
      if (page === "stats") populateDropdowns();
      if (page === "enrollment") populateDropdowns();
      if (page === "export") populateDropdowns();
      if (page === "dashboard") loadDashboard();
    });
  });
}

// ── Auth tabs ─────────────────────────────────────────────────────────────────

function setupAuthTabs() {
  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document
        .querySelectorAll(".auth-tab")
        .forEach((t) => t.classList.remove("active"));
      document
        .querySelectorAll(".auth-form-panel")
        .forEach((p) => p.classList.add("hidden"));
      tab.classList.add("active");
      document
        .getElementById(`auth-panel-${tab.dataset.authTab}`)
        ?.classList.remove("hidden");
    });
  });
}

// ── Utility helpers ───────────────────────────────────────────────────────────

function v(id) {
  return document.getElementById(id)?.value?.trim() ?? "";
}
function clear(...ids) {
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

// ── Bind all events ───────────────────────────────────────────────────────────

function bindEvents() {
  on("btn-login", handleLogin);
  on("btn-register", handleRegister);
  on("btn-logout", handleLogout);

  on("btn-create-student", handleCreateStudent);
  on("btn-refresh-students", loadStudents);

  on("btn-create-course", handleCreateCourse);
  on("btn-refresh-courses", loadCourses);

  on("btn-create-session", handleCreateSession);
  on("btn-refresh-sessions", loadSessions);

  on("btn-fetch-summary", handleFetchSummary);
  on("btn-mark", handleMarkAttendance);
  on("btn-bulk", handleBulkMark);

  on("btn-fetch-stats", handleFetchStats);
  on("btn-load-my-attendance", loadMyAttendance);

  on("btn-enroll", handleEnroll);
  on("btn-unenroll", handleUnenroll);
  on("btn-enrollments-student", handleEnrollmentsByStudent);
  on("btn-enrollments-course", handleEnrollmentsByCourse);

  on("sub-btn", handleToggleSub);
  on("btn-export-stats", handleExportStats);
  on("btn-export-session", handleExportSession);

  window.addEventListener("logout", handleLogout);
}

function on(id, fn) {
  document.getElementById(id)?.addEventListener("click", fn);
}

// ── Init ──────────────────────────────────────────────────────────────────────

setupNav();
setupAuthTabs();
bindEvents();
showAuthScreen();
