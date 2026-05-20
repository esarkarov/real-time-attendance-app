// ui.js — rendering and DOM utilities

import { toast } from "./toast.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

export function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (loading) {
    btn.dataset.origText = btn.innerHTML;
    btn.innerHTML = `<span class="spinner"></span> Loading...`;
    btn.disabled = true;
  } else {
    btn.innerHTML = btn.dataset.origText || btn.innerHTML;
    btn.disabled = false;
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => toast.info("Copied!"));
}

function idCell(id) {
  const short = id.slice(-8);
  return `<div class="id-cell"><span class="mono">${short}</span><button class="copy-btn" onclick="navigator.clipboard.writeText('${id}').then(()=>window.showToastInfo('Copied!'))" title="Copy full ID">⧉</button></div>`;
}

function statusBadge(status) {
  const map = {
    UPCOMING: "badge-blue",
    ONGOING: "badge-green",
    CLOSED: "badge-muted",
    PRESENT: "badge-green",
    ABSENT: "badge-red",
    LATE: "badge-amber",
    TEACHER: "badge-purple",
    STUDENT: "badge-green",
  };
  return `<span class="badge ${map[status] ?? "badge-muted"}">${status}</span>`;
}

function formatDate(ts) {
  const d = new Date(parseInt(ts));
  return isNaN(d)
    ? ts
    : d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

function formatDateTime(ts) {
  const d = new Date(parseInt(ts));
  return isNaN(d)
    ? ts
    : d.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export function showAuthScreen() {
  document.getElementById("auth-screen").classList.remove("hidden");
  document.getElementById("app").classList.add("hidden");
}

export function showApp(user) {
  document.getElementById("auth-screen").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");

  // Sidebar user info
  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const roleClass = user.role === "TEACHER" ? "teacher" : "student";
  document.getElementById("sidebar-user-avatar").textContent = initials;
  document.getElementById("sidebar-user-avatar").className =
    `user-avatar ${roleClass}`;
  document.getElementById("sidebar-user-name").textContent = user.name;
  document.getElementById("sidebar-user-role").textContent = user.role;

  // Hide teacher-only nav items for students
  document.querySelectorAll(".teacher-nav").forEach((el) => {
    el.classList.toggle("hidden", user.role !== "TEACHER");
  });
  document.querySelectorAll(".student-nav").forEach((el) => {
    el.classList.toggle("hidden", user.role !== "STUDENT");
  });
}

export function setAuthError(msg, type = "login") {
  const id = type === "register" ? "reg-error" : "auth-error";
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.toggle("hidden", !msg);
}

// ── Navigation ────────────────────────────────────────────────────────────────

export function navigateTo(pageId) {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document
    .querySelectorAll(".nav-item")
    .forEach((n) => n.classList.remove("active"));
  const page = document.getElementById(`page-${pageId}`);
  if (page) page.classList.add("active");
  const navItem = document.querySelector(`[data-page="${pageId}"]`);
  if (navItem) navItem.classList.add("active");
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

// ── Teacher dashboard ─────────────────────────────────────────────────────────
export function renderTeacherDashboard(stats) {
  if (!stats) return;
  const container = document.getElementById("dashboard-stats");
  if (!container) return;
  container.innerHTML = `
    <div class="stat-card blue">
      <div class="stat-label">STUDENTS</div>
      <div class="stat-value">${stats.totalStudents}</div>
      <div class="stat-sub">Registered</div>
    </div>
    <div class="stat-card green">
      <div class="stat-label">SESSIONS</div>
      <div class="stat-value">${stats.totalSessions}</div>
      <div class="stat-sub">Total</div>
    </div>
    <div class="stat-card amber">
      <div class="stat-label">ONGOING</div>
      <div class="stat-value">${stats.ongoingSessions}</div>
      <div class="stat-sub">Active now</div>
    </div>
    <div class="stat-card green">
      <div class="stat-label">RECORDS</div>
      <div class="stat-value">${stats.totalAttendanceRecords}</div>
      <div class="stat-sub">Attendance marked</div>
    </div>
  `;
}

// ── Student dashboard ─────────────────────────────────────────────────────────
export function renderStudentDashboard(stats) {
  const container = document.getElementById("dashboard-stats");
  if (!container) return;
  if (!stats) {
    container.innerHTML = `
      <div class="stat-card blue">
        <div class="stat-label">MY ATTENDANCE</div>
        <div class="stat-value">—</div>
        <div class="stat-sub">No records yet</div>
      </div>`;
    return;
  }
  const rateColor =
    stats.attendanceRate >= 75
      ? "green"
      : stats.attendanceRate >= 50
        ? "amber"
        : "red";
  container.innerHTML = `
    <div class="stat-card blue">
      <div class="stat-label">MY ATTENDANCE</div>
      <div class="stat-value">${stats.totalSessions}</div>
      <div class="stat-sub">Total records</div>
    </div>
    <div class="stat-card green">
      <div class="stat-label">PRESENT</div>
      <div class="stat-value">${stats.present}</div>
      <div class="stat-sub">On time</div>
    </div>
    <div class="stat-card amber">
      <div class="stat-label">LATE</div>
      <div class="stat-value">${stats.late}</div>
      <div class="stat-sub">After threshold</div>
    </div>
    <div class="stat-card red">
      <div class="stat-label">ABSENT</div>
      <div class="stat-value">${stats.absent}</div>
      <div class="stat-sub">Missed</div>
    </div>
    <div class="stat-card ${rateColor}">
      <div class="stat-label">MY RATE</div>
      <div class="stat-value">${stats.attendanceRate.toFixed(1)}%</div>
      <div class="stat-sub">Personal rate</div>
    </div>
  `;
}

// ── Keep old renderDashboard as no-op for compatibility ───────────────────────
export function renderDashboard() {}

// ── Students table ────────────────────────────────────────────────────────────

export function renderStudents(data, onDelete, onViewStats) {
  const tbody = document.getElementById("students-tbody");
  const students = data?.data?.students ?? [];

  if (!students.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">👤</div>No students yet</div></td></tr>`;
    return;
  }

  tbody.innerHTML = students
    .map(
      (s, i) => `
    <tr>
      <td class="td-muted">${i + 1}</td>
      <td><span class="fw-600">${s.name}</span></td>
      <td class="td-mono">${s.studentId}</td>
      <td class="td-muted">${s.email}</td>
      <td>${idCell(s.id)}</td>
      <td>
        <button class="btn btn-sm" onclick="window._viewStudentStats('${s.id}')">📊 Stats</button>
        <button class="btn btn-sm btn-danger" onclick="window._deleteStudent('${s.id}')">Delete</button>
      </td>
    </tr>
  `,
    )
    .join("");

  window._deleteStudent = onDelete;
  window._viewStudentStats = onViewStats;
}

// ── Courses table ─────────────────────────────────────────────────────────────

export function renderCourses(data, onDelete) {
  const tbody = document.getElementById("courses-tbody");
  const courses = data?.data?.courses ?? [];

  if (!courses.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">📚</div>No courses yet</div></td></tr>`;
    return;
  }

  tbody.innerHTML = courses
    .map(
      (c, i) => `
    <tr>
      <td class="td-muted">${i + 1}</td>
      <td><span class="fw-600">${c.name}</span></td>
      <td>${statusBadge("TEACHER").replace("TEACHER", c.code)}<span class="badge badge-blue">${c.code}</span></td>
      <td class="td-muted">${c.instructor}</td>
      <td>${idCell(c.id)}</td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="window._deleteCourse('${c.id}')">Delete</button>
      </td>
    </tr>
  `,
    )
    .join("");

  window._deleteCourse = onDelete;
}

// ── Sessions table ────────────────────────────────────────────────────────────

export function renderSessions(
  data,
  { onOpen, onClose, onExport, onDelete, onViewSummary },
) {
  const tbody = document.getElementById("sessions-tbody");
  const sessions = data?.data?.sessions ?? [];

  if (!sessions.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">📅</div>No sessions yet</div></td></tr>`;
    return;
  }

  tbody.innerHTML = sessions
    .map((s, i) => {
      const actions = [];
      if (s.status === "UPCOMING")
        actions.push(
          `<button class="btn btn-sm btn-success" onclick="window._openSession('${s.id}')">▶ Open</button>`,
        );
      if (s.status === "ONGOING")
        actions.push(
          `<button class="btn btn-sm btn-danger"  onclick="window._closeSession('${s.id}')">■ Close</button>`,
        );
      actions.push(
        `<button class="btn btn-sm" onclick="window._viewSummary('${s.id}')">Summary</button>`,
      );
      actions.push(
        `<button class="btn btn-sm btn-amber" onclick="window._exportSession('${s.id}')">⬇ Export</button>`,
      );

      return `
      <tr>
        <td class="td-muted">${i + 1}</td>
        <td><span class="fw-600">${s.course.code}</span><span class="td-muted"> — ${s.course.name}</span></td>
        <td class="td-muted">${formatDateTime(s.date)}</td>
        <td class="td-muted">${s.location}</td>
        <td>${statusBadge(s.status)}</td>
        <td>${idCell(s.id)}</td>
        <td><div class="btn-group">${actions.join("")}</div></td>
      </tr>
    `;
    })
    .join("");

  window._openSession = onOpen;
  window._closeSession = onClose;
  window._exportSession = onExport;
  window._viewSummary = onViewSummary;
}

// ── Attendance summary ────────────────────────────────────────────────────────

export function renderAttendanceSummary(data) {
  const el = document.getElementById("summary-result");
  if (!data?.data?.attendanceBySession) {
    el.innerHTML = "";
    return;
  }

  const { totalPresent, totalAbsent, totalLate, session, records } =
    data.data.attendanceBySession;
  const total = totalPresent + totalAbsent + totalLate;
  const rate =
    total > 0 ? Math.round(((totalPresent + totalLate) / total) * 100) : 0;
  const barColor = rate >= 75 ? "green" : rate >= 50 ? "amber" : "red";

  el.innerHTML = `
    <div class="section" style="margin-top:16px;">
      <div class="section-header">
        <span class="section-title">${session.course.name} — ${formatDate(session.date)} @ ${session.location}</span>
        ${statusBadge(session.status)}
      </div>
      <div class="section-body">
        <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:16px;">
          <div class="stat-card green"><div class="stat-label">Present</div><div class="stat-value">${totalPresent}</div></div>
          <div class="stat-card amber"><div class="stat-label">Late</div><div class="stat-value">${totalLate}</div></div>
          <div class="stat-card red"><div class="stat-label">Absent</div><div class="stat-value">${totalAbsent}</div></div>
          <div class="stat-card blue"><div class="stat-label">Rate</div><div class="stat-value">${rate}%</div></div>
        </div>
        <div class="progress-wrap" style="margin-bottom:16px;">
          <div class="progress-bar ${barColor}" style="width:${rate}%"></div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Student</th><th>ID</th><th>Status</th><th>Marked At</th></tr></thead>
            <tbody>
              ${records
                .map(
                  (r, i) => `
                <tr>
                  <td class="td-muted">${i + 1}</td>
                  <td class="fw-600">${r.student.name}</td>
                  <td class="td-mono">${r.student.studentId}</td>
                  <td>${statusBadge(r.status)}</td>
                  <td class="td-muted">${formatDateTime(r.markedAt)}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// ── Student stats ─────────────────────────────────────────────────────────────

export function renderStudentStats(data) {
  const el = document.getElementById("stats-result");
  if (!data?.data?.studentStats) {
    el.innerHTML = "";
    return;
  }

  const s = data.data.studentStats;
  const rate = s.attendanceRate.toFixed(1);
  const bar = Math.round(s.attendanceRate);
  const barColor = bar >= 75 ? "green" : bar >= 50 ? "amber" : "red";

  el.innerHTML = `
    <div class="section" style="margin-top:16px;">
      <div class="section-header">
        <span class="section-title">${s.student.name}</span>
        <span class="badge badge-blue">${s.student.studentId}</span>
        <span class="text-muted text-sm">${s.student.email}</span>
      </div>
      <div class="section-body">
        <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:16px;">
          <div class="stat-card green"><div class="stat-label">Present</div><div class="stat-value">${s.present}</div></div>
          <div class="stat-card amber"><div class="stat-label">Late</div><div class="stat-value">${s.late}</div></div>
          <div class="stat-card red"><div class="stat-label">Absent</div><div class="stat-value">${s.absent}</div></div>
          <div class="stat-card blue"><div class="stat-label">Total</div><div class="stat-value">${s.totalSessions}</div></div>
        </div>
        <div class="flex items-center gap-8" style="margin-bottom:6px;">
          <span class="text-sm text-muted">Attendance Rate</span>
          <span class="fw-600" style="color:var(--${barColor})">${rate}%</span>
        </div>
        <div class="progress-wrap">
          <div class="progress-bar ${barColor}" style="width:${bar}%"></div>
        </div>
      </div>
    </div>
  `;
}

// ── My Attendance (student) ───────────────────────────────────────────────────

export function renderMyAttendance(data) {
  const tbody = document.getElementById("my-attendance-tbody");
  const records = data?.data?.myAttendance ?? [];

  if (!records.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">📋</div>No attendance records yet</div></td></tr>`;
    return;
  }

  tbody.innerHTML = records
    .map(
      (r, i) => `
    <tr>
      <td class="td-muted">${i + 1}</td>
      <td class="fw-600">${r.session.course.name}</td>
      <td class="td-mono">${r.session.course.code}</td>
      <td class="td-muted">${r.session.location}</td>
      <td>${statusBadge(r.status)}</td>
      <td class="td-muted">${formatDateTime(r.markedAt)}</td>
    </tr>
  `,
    )
    .join("");
}

// ── Bulk result ───────────────────────────────────────────────────────────────

export function renderBulkResult(data) {
  const el = document.getElementById("bulk-result");
  if (!data?.data?.markAttendanceBulk) return;

  const { successful, failed } = data.data.markAttendanceBulk;

  let html = `<div class="flex gap-8 items-center" style="margin-bottom:10px;">
    <span class="badge badge-green">✓ ${successful.length} marked</span>
    ${failed.length ? `<span class="badge badge-red">✕ ${failed.length} failed</span>` : ""}
  </div>`;

  if (successful.length) {
    html += `<div class="table-wrap"><table>
      <thead><tr><th>Student</th><th>ID</th><th>Status</th></tr></thead>
      <tbody>
        ${successful.map((r) => `<tr><td class="fw-600">${r.student.name}</td><td class="td-mono">${r.student.studentId}</td><td>${statusBadge(r.status)}</td></tr>`).join("")}
      </tbody>
    </table></div>`;
  }

  if (failed.length) {
    html += `<div style="margin-top:10px;">
      ${failed.map((f) => `<div style="padding:6px 0; border-bottom:1px solid var(--border); font-size:0.8rem; color:var(--red);">✕ <span class="mono">${f.studentId.slice(-8)}</span> — ${f.reason}</div>`).join("")}
    </div>`;
  }

  el.innerHTML = html;
  el.classList.remove("hidden");
}

// ── Real-time feed ────────────────────────────────────────────────────────────

export function appendFeedEvent(record) {
  const feed = document.getElementById("feed");
  const empty = feed.querySelector(".feed-empty");
  if (empty) empty.remove();

  const entry = document.createElement("div");
  entry.className = "feed-entry";
  entry.innerHTML = `
    <span class="feed-time">${new Date().toLocaleTimeString()}</span>
    <span class="feed-name">${record.student?.name ?? "?"}</span>
    ${statusBadge(record.status)}
    <span class="feed-loc">@ ${record.session?.location ?? "?"}</span>
  `;
  feed.insertBefore(entry, feed.firstChild);
}

export function appendFeedError(payload) {
  const feed = document.getElementById("feed");
  const entry = document.createElement("div");
  entry.className = "feed-entry";
  entry.innerHTML = `<span class="feed-time">${new Date().toLocaleTimeString()}</span><span style="color:var(--red);">ERROR: ${JSON.stringify(payload)}</span>`;
  feed.insertBefore(entry, feed.firstChild);
}

export function setWsStatus(connected) {
  const dot = document.getElementById("ws-dot");
  const label = document.getElementById("ws-label");
  if (dot) dot.className = connected ? "ws-dot on" : "ws-dot";
  if (label) label.textContent = connected ? "Live" : "Disconnected";
}

export function setSubButton(active) {
  const btn = document.getElementById("sub-btn");
  if (!btn) return;
  btn.textContent = active ? "■ Stop" : "▶ Start";
  btn.className = active ? "btn btn-danger" : "btn btn-success";
}

// ── Enrollments ───────────────────────────────────────────────────────────────

export function renderEnrollments(data, type) {
  const el = document.getElementById("enroll-result");

  if (type === "student") {
    const enrollments = data?.data?.enrollmentsByStudent ?? [];
    if (!enrollments.length) {
      el.innerHTML = '<div class="empty-state">No enrollments found</div>';
      return;
    }
    el.innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th>Course</th><th>Code</th><th>Instructor</th><th>Enrolled</th></tr></thead>
      <tbody>
        ${enrollments
          .map(
            (e) => `<tr>
          <td class="fw-600">${e.course.name}</td>
          <td><span class="badge badge-blue">${e.course.code}</span></td>
          <td class="td-muted">${e.course.instructor}</td>
          <td class="td-muted">${formatDate(e.enrolledAt)}</td>
        </tr>`,
          )
          .join("")}
      </tbody>
    </table></div>`;
  } else {
    const enrollments = data?.data?.enrollmentsByCourse ?? [];
    if (!enrollments.length) {
      el.innerHTML = '<div class="empty-state">No enrollments found</div>';
      return;
    }
    el.innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th>Student</th><th>ID</th><th>Email</th><th>Enrolled</th></tr></thead>
      <tbody>
        ${enrollments
          .map(
            (e) => `<tr>
          <td class="fw-600">${e.student.name}</td>
          <td class="td-mono">${e.student.studentId}</td>
          <td class="td-muted">${e.student.email}</td>
          <td class="td-muted">${formatDate(e.enrolledAt)}</td>
        </tr>`,
          )
          .join("")}
      </tbody>
    </table></div>`;
  }
}
