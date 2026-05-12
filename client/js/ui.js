// ui.js — DOM helpers and rendering utilities

export function showResult(elementId, data) {
  document.getElementById(elementId).textContent =
    JSON.stringify(data, null, 2);
}

export function showError(elementId, message) {
  document.getElementById(elementId).textContent = `// Error: ${message}`;
}

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
  const feed = document.getElementById('feed');
  const empty = feed.querySelector('.feed-empty');
  if (empty) empty.remove();

  const time = new Date().toLocaleTimeString();
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
  const feed = document.getElementById('feed');
  const time = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `
    <span class="log-time">${time}</span>
    <span class="log-error">ERROR: ${JSON.stringify(payload)}</span>
  `;
  feed.prepend(entry);
}

// ── Tab switching ─────────────────────────────────────────────────────────────

export function initTabs(containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const tabs    = container.querySelectorAll('[data-tab]');
  const panels  = container.querySelectorAll('[data-panel]');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('tab-active'));
      panels.forEach(p => p.classList.add('hidden'));
      tab.classList.add('tab-active');
      const target = container.querySelector(`[data-panel="${tab.dataset.tab}"]`);
      if (target) target.classList.remove('hidden');
    });
  });
}

// ── Stats renderer ────────────────────────────────────────────────────────────

export function renderStats(data) {
  const el = document.getElementById('stats-result');
  if (!data?.data?.studentStats) {
    el.textContent = JSON.stringify(data, null, 2);
    return;
  }
  const s = data.data.studentStats;
  const rate = s.attendanceRate.toFixed(1);
  const bar = Math.round(s.attendanceRate);

  el.innerHTML = `
    <div class="stats-card">
      <div class="stats-name">${s.student.name} <span class="stats-id">${s.student.studentId}</span></div>
      <div class="stats-email">${s.student.email}</div>
      <div class="stats-bar-wrap">
        <div class="stats-bar" style="width:${bar}%"></div>
      </div>
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
  if (!data?.data?.markAttendanceBulk) {
    el.textContent = JSON.stringify(data, null, 2);
    return;
  }
  const { successful, failed } = data.data.markAttendanceBulk;
  let html = `<div class="bulk-summary">`;
  html += `<span class="bulk-ok">✓ ${successful.length} marked</span>`;
  if (failed.length) html += `  <span class="bulk-fail">✗ ${failed.length} failed</span>`;
  html += `</div>`;

  if (successful.length) {
    html += successful.map(r =>
      `<div class="bulk-row ok">✓ ${r.student.name} → <span class="log-status-${r.status}">${r.status}</span></div>`
    ).join('');
  }
  if (failed.length) {
    html += failed.map(f =>
      `<div class="bulk-row fail">✗ ${f.studentId} — ${f.reason}</div>`
    ).join('');
  }
  el.innerHTML = html;
}
