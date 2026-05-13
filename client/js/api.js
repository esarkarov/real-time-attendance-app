// api.js — GraphQL HTTP client

const API_URL    = 'http://localhost:4000/graphql';
const EXPORT_URL = 'http://localhost:4000/export';

// ── Token management ──────────────────────────────────────────────────────────

let _token = null;

export function setToken(token) { _token = token; }
export function getToken()      { return _token; }
export function clearToken()    { _token = null; }

function authHeaders() {
  const h = { 'Content-Type': 'application/json' };
  if (_token) h['Authorization'] = `Bearer ${_token}`;
  return h;
}

// ── Core GQL fetcher ──────────────────────────────────────────────────────────

export async function gql(query, variables = {}) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  const data = await res.json();
  // Surface GraphQL errors cleanly
  if (data.errors?.length) throw new Error(data.errors[0].message);
  return data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const login = (email, password) => gql(`
  mutation($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user { id name email role studentId }
    }
  }
`, { email, password });

export const register = (name, email, password, role, studentId) => gql(`
  mutation($name: String!, $email: String!, $password: String!, $role: UserRole!, $studentId: ID) {
    register(name: $name, email: $email, password: $password, role: $role, studentId: $studentId) {
      token
      user { id name email role studentId }
    }
  }
`, { name, email, password, role, studentId: studentId || null });

export const getMe = () => gql(`
  query { me { id name email role studentId } }
`);

// ── Queries ───────────────────────────────────────────────────────────────────

export const getStudents = (limit = 50, offset = 0) => gql(`
  query($limit: Int, $offset: Int) {
    students(limit: $limit, offset: $offset) { id name email studentId createdAt }
  }
`, { limit, offset });

export const getCourses = (limit = 50, offset = 0) => gql(`
  query($limit: Int, $offset: Int) {
    courses(limit: $limit, offset: $offset) { id name code instructor }
  }
`, { limit, offset });

export const getSessions = (limit = 50, offset = 0) => gql(`
  query($limit: Int, $offset: Int) {
    sessions(limit: $limit, offset: $offset) {
      id date location status lateThresholdMinutes
      course { id name code instructor }
    }
  }
`, { limit, offset });

export const getAttendanceSummary = (sessionId) => gql(`
  query($sessionId: ID!) {
    attendanceBySession(sessionId: $sessionId) {
      totalPresent totalAbsent totalLate
      session { date location status course { name } }
      records { status markedAt student { name studentId } }
    }
  }
`, { sessionId });

export const getStudentStats = (studentId) => gql(`
  query($studentId: ID!) {
    studentStats(studentId: $studentId) {
      totalSessions present absent late attendanceRate
      student { name studentId email }
    }
  }
`, { studentId });

export const getMyAttendance = (limit = 50, offset = 0) => gql(`
  query($limit: Int, $offset: Int) {
    myAttendance(limit: $limit, offset: $offset) {
      id status markedAt
      session { date location course { name code } }
    }
  }
`, { limit, offset });

export const getEnrollmentsByStudent = (studentId) => gql(`
  query($studentId: ID!) {
    enrollmentsByStudent(studentId: $studentId) {
      id enrolledAt
      course { id name code instructor }
    }
  }
`, { studentId });

export const getEnrollmentsByCourse = (courseId) => gql(`
  query($courseId: ID!) {
    enrollmentsByCourse(courseId: $courseId) {
      id enrolledAt
      student { id name studentId email }
    }
  }
`, { courseId });

// ── Mutations ─────────────────────────────────────────────────────────────────

export const openSession  = (id) => gql(`mutation($id: ID!) { openSession(id: $id)  { id status } }`, { id });
export const closeSession = (id) => gql(`mutation($id: ID!) { closeSession(id: $id) { id status } }`, { id });

export const markAttendance = (studentId, sessionId, status) => gql(`
  mutation($studentId: ID!, $sessionId: ID!, $status: AttendanceStatus) {
    markAttendance(studentId: $studentId, sessionId: $sessionId, status: $status) {
      id status markedAt
      student { name }
      session { date location }
    }
  }
`, { studentId, sessionId, status });

export const markAttendanceBulk = (sessionId, records) => gql(`
  mutation($sessionId: ID!, $records: [BulkAttendanceInput!]!) {
    markAttendanceBulk(sessionId: $sessionId, records: $records) {
      successful { id status markedAt student { name studentId } session { location } }
      failed { studentId reason }
    }
  }
`, { sessionId, records });

export const enrollStudent   = (studentId, courseId) => gql(`
  mutation($studentId: ID!, $courseId: ID!) {
    enrollStudent(studentId: $studentId, courseId: $courseId) {
      id enrolledAt student { name studentId } course { name code }
    }
  }
`, { studentId, courseId });

export const unenrollStudent = (studentId, courseId) => gql(`
  mutation($studentId: ID!, $courseId: ID!) { unenrollStudent(studentId: $studentId, courseId: $courseId) }
`, { studentId, courseId });

// ── Export (REST) ─────────────────────────────────────────────────────────────

export function exportSessionAttendance(sessionId) {
  window.open(`${EXPORT_URL}/session/${sessionId}?token=${_token}`, '_blank');
}

export function exportStats() {
  // Use fetch + blob so we can send the auth header properly
  fetch(`${EXPORT_URL}/stats`, { headers: authHeaders() })
    .then(res => res.blob())
    .then(blob => {
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `student_stats_${new Date().toISOString().slice(0,10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    })
    .catch(err => alert(`Export failed: ${err.message}`));
}

export function exportSessionFile(sessionId) {
  fetch(`${EXPORT_URL}/session/${sessionId}`, { headers: authHeaders() })
    .then(res => res.blob())
    .then(blob => {
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `session_attendance_${sessionId}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    })
    .catch(err => alert(`Export failed: ${err.message}`));
}
