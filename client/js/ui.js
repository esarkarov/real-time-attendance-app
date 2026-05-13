// ui.js — DOM helpers and rendering utilities

// ── Generic ───────────────────────────────────────────────────────────────────

export function showResult(elementId, data) {
  document.getElementById(elementId).textContent = JSON.stringify(data, null, 2);
}

export function showError(elementId, message) {
  document.getElementById(elementId).textContent = `// Error: ${message}`;
}

// ── Auth UI ───────────────────────────────────────────────────────────────────

export function renderAuthUser(user) {
  const el = document.getElementById('auth-user');
  if (!user) {
    el.innerHTML = `<span class="auth-guest">Not logged in</span>`;
    document.getElementById('auth-panel').classList.remove('hidden');
    document.getElementById('app-grid').classList.add('hidden');
    return;
  }
  const roleColor = user.role === 'TEACHER' ? 'var(--purple)' : 'var(--green)';
  el.innerHTML = `
    <span style="color:${roleColor}; font-weight:600;">${user.name}</span>
    <span class="auth-role">${user.role}</span>
    <span class="auth-email">${user.email}</span>
    <button id="btn-logout" class="btn-danger" style="padding:4px 10px; font-size:0.7rem;">Logout</button>
  `;
  document.getElementById('auth-panel').classList.add('hidden');
  document.getElementById('app-grid').classList.remove('hidden');

  // Show/hide teacher-only sections
  const teacherOnly = document.querySelectorAll('.teacher-only');
  const studentOnly = document.querySelectorAll('.student-only');
  teacherOnly.forEach(el => el.classList.toggle('hidden', user.role !== 'TEACHER'));
  studentOnly.forEach(el => el.classList.toggle('hidden', user.role !== 'STUDENT'));

  document.getElementById('btn-logout')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('logout'));
  });
}

export function setAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.classList.toggle('hidden', !msg);
}

// ── WebSocket ─────────────────────────────────────────────────────────────────

export function setWsStatus(connected) {
  const dot   = document.getElementById('ws-dot');
  const label = document.getElementById('ws-label');
  dot.className     = connected ? 'ws-dot connected' : 'ws-dot';
  label.textContent = connected ? 'connected' : 'disconnected';
}

export function setSubButton(active) {
  const btn = document.getElementById('sub-btn');
  btn.textContent = active ? '■ Stop' : '▶ Start Subscription';
  btn.className   = active ? 'btn-active' : 'btn-primary';
}

export function appendFeedEvent(record) {
  const feed  = document.getElementById('feed');
  const empty = feed.querySelector('.feed-empty');
  if (empty) empty.remove();

  const time  = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `
    <span class="log-time">${time}</span>
    <span class="log-name">${record.student?.name ?? '?'}</span>
    <span class="log-arrow">→</span>
    <span class="log-status-${record.status}">${record.status}</span>
    <span class="log-location">@ ${record.session?.location ?? '?'}</span>
  `;
  feed.prepend(entry);
}

export function appendFeedError(payload) {
  const feed  = document.getElementById('feed');
  const time  = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `<span class="log-time">${time}</span><span class="log-error">ERROR: ${JSON.stringify(payload)}</span>`;
  feed.prepend(entry);
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

export function initTabs(containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;
  const tabs   = container.querySelectorAll('[data-tab]');
  const panels = container.querySelectorAll('[data-panel]');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('tab-active'));
      panels.forEach(p => p.classList.add('hidden'));
      tab.classList.add('tab-active');
      container.querySelector(`[data-panel="${tab.dataset.tab}"]`)?.classList.remove('hidden');
    });
  });
}

// ── Session status badge ──────────────────────────────────────────────────────

function statusBadge(status) {
  const colors = { UPCOMING: 'var(--accent)', ONGOING: 'var(--green)', CLOSED: 'var(--muted)' };
  return `<span style="color:${colors[status] ?? 'var(--text)'}; font-weight:600;">${status}</span>`;
}

// ── Sessions renderer ─────────────────────────────────────────────────────────

export function renderSessions(data) {
  const el = document.getElementById('query-result');
  if (!data?.data?.sessions) { el.textContent = JSON.stringify(data, null, 2); return; }
  const sessions = data.data.sessions;
  if (!sessions.length) { el.textContent = '// No sessions found'; return; }

  el.innerHTML = sessions.map(s => `
    <div class="session-row">
      <div class="session-info">
        <span class="session-course">${s.course.code}</span>
        <span class="session-date">${new Date(parseInt(s.date)).toLocaleString()}</span>
        <span class="session-loc">📍 ${s.location}</span>
        ${statusBadge(s.status)}
      </div>
      <div class="session-id">ID: <code>${s.id}</code></div>
      <div class="session-actions teacher-only" style="display:flex; gap:6px; margin-top:6px;">
        <button onclick="window.dispatchEvent(new CustomEvent('openSession', {detail:'${s.id}'}))">▶ Open</button>
        <button onclick="window.dispatchEvent(new CustomEvent('closeSession', {detail:'${s.id}'}))" class="btn-danger">■ Close</button>
        <button onclick="window.dispatchEvent(new CustomEvent('exportSession', {detail:'${s.id}'}))" style="border-color:var(--yellow); color:var(--yellow);">⬇ Export</button>
      </div>
    </div>
  `).join('<hr style="border-color:var(--border); margin:6px 0;">');
}

// ── My Attendance renderer ────────────────────────────────────────────────────

export function renderMyAttendance(data) {
  const el = document.getElementById('my-attendance-result');
  if (!data?.data?.myAttendance) { el.textContent = JSON.stringify(data, null, 2); return; }
  const records = data.data.myAttendance;
  if (!records.length) { el.textContent = '// No attendance records yet'; return; }

  el.innerHTML = records.map(r => `
    <div class="log-entry">
      <span class="log-time">${new Date(parseInt(r.markedAt)).toLocaleDateString()}</span>
      <span class="log-name">${r.session.course.name}</span>
      <span class="log-arrow">→</span>
      <span class="log-status-${r.status}">${r.status}</span>
      <span class="log-location">@ ${r.session.location}</span>
    </div>
  `).join('');
}

// ── Stats renderer ────────────────────────────────────────────────────────────

export function renderStats(data) {
  const el = document.getElementById('stats-result');
  if (!data?.data?.studentStats) { el.textContent = JSON.stringify(data, null, 2); return; }
  const s    = data.data.studentStats;
  const rate = s.attendanceRate.toFixed(1);
  const bar  = Math.round(s.attendanceRate);
  el.innerHTML = `
    <div class="stats-card">
      <div class="stats-name">${s.student.name} <span class="stats-id">${s.student.studentId}</span></div>
      <div class="stats-email">${s.student.email}</div>
      <div class="stats-bar-wrap"><div class="stats-bar" style="width:${bar}%"></div></div>
      <div class="stats-rate">${rate}% attendance rate</div>
      <div class="stats-grid">
        <div class="stat present"><span>${s.present}</span>Present</div>
        <div class="stat late"><span>${s.late}</span>Late</div>
        <div class="stat absent"><span>${s.absent}</span>Absent</div>
        <div class="stat total"><span>${s.totalSessions}</span>Total</div>
      </div>
    </div>
  `;
}

// ── Bulk result renderer ──────────────────────────────────────────────────────

export function renderBulkResult(data) {
  const el = document.getElementById('bulk-result');
  if (!data?.data?.markAttendanceBulk) { el.textContent = JSON.stringify(data, null, 2); return; }
  const { successful, failed } = data.data.markAttendanceBulk;
  let html = `<div class="bulk-summary"><span class="bulk-ok">✓ ${successful.length} marked</span>`;
  if (failed.length) html += `<span class="bulk-fail">✗ ${failed.length} failed</span>`;
  html += `</div>`;
  html += successful.map(r => `<div class="bulk-row ok">✓ ${r.student.name} → <span class="log-status-${r.status}">${r.status}</span></div>`).join('');
  html += failed.map(f => `<div class="bulk-row fail">✗ ${f.studentId} — ${f.reason}</div>`).join('');
  el.innerHTML = html;
}
