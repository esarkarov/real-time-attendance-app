// api.js — GraphQL HTTP + REST client

const API_URL = "http://localhost:4000/graphql";
const EXPORT_URL = "http://localhost:4000/export";

let _token = null;

export function setToken(t) {
  _token = t;
}
export function getToken() {
  return _token;
}
export function clearToken() {
  _token = null;
}

function authHeaders() {
  const h = { "Content-Type": "application/json" };
  if (_token) h["Authorization"] = `Bearer ${_token}`;
  return h;
}

export async function gql(query, variables = {}) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  const data = await res.json();
  if (data.errors?.length) throw new Error(data.errors[0].message);
  return data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const login = (email, password) =>
  gql(
    `
  mutation($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token user { id name email role studentId }
    }
  }
`,
    { email, password },
  );

export const register = (name, email, password, role) =>
  gql(
    `
  mutation($name: String!, $email: String!, $password: String!, $role: UserRole!) {
    register(name: $name, email: $email, password: $password, role: $role) {
      token user { id name email role studentId }
    }
  }
`,
    { name, email, password, role },
  );

// ── Queries ───────────────────────────────────────────────────────────────────

export const getDashboardStats = () =>
  gql(
    `query{ dashboardStats{ totalStudents totalCourses totalSessions ongoingSessions totalAttendanceRecords overallAttendanceRate } }`,
  );

export const getStudents = (limit = 50, offset = 0) =>
  gql(
    `query($limit:Int,$offset:Int){ students(limit:$limit,offset:$offset){ id name email studentId createdAt } }`,
    { limit, offset },
  );
export const getCourses = (limit = 50, offset = 0) =>
  gql(
    `query($limit:Int,$offset:Int){ courses(limit:$limit,offset:$offset){ id name code instructor createdAt } }`,
    { limit, offset },
  );
export const getSessions = (limit = 50, offset = 0) =>
  gql(
    `query($limit:Int,$offset:Int){ sessions(limit:$limit,offset:$offset){ id date location status lateThresholdMinutes course{ id name code instructor } } }`,
    { limit, offset },
  );

export const getAttendanceSummary = (sessionId) =>
  gql(
    `
  query($sessionId: ID!) {
    attendanceBySession(sessionId: $sessionId) {
      totalPresent totalAbsent totalLate
      session { date location status course { name code } }
      records { status markedAt student { name studentId } }
    }
  }
`,
    { sessionId },
  );

export const getStudentStats = (studentId) =>
  gql(
    `
  query($studentId: ID!) {
    studentStats(studentId: $studentId) {
      totalSessions present absent late attendanceRate
      student { name studentId email }
    }
  }
`,
    { studentId },
  );

export const getMyAttendance = (limit = 50, offset = 0) =>
  gql(
    `
  query($limit:Int,$offset:Int){ myAttendance(limit:$limit,offset:$offset){ id status markedAt session{ date location course{ name code } } } }
`,
    { limit, offset },
  );

export const getEnrollmentsByStudent = (studentId) =>
  gql(
    `query($studentId:ID!){ enrollmentsByStudent(studentId:$studentId){ id enrolledAt course{ id name code instructor } } }`,
    { studentId },
  );
export const getEnrollmentsByCourse = (courseId) =>
  gql(
    `query($courseId:ID!){ enrollmentsByCourse(courseId:$courseId){ id enrolledAt student{ id name studentId email } } }`,
    { courseId },
  );

// ── Mutations ─────────────────────────────────────────────────────────────────

export const createStudent = (name, email, studentId, password) =>
  gql(
    `
  mutation($name:String!, $email:String!, $studentId:String!, $password:String!) {
    createStudent(name:$name, email:$email, studentId:$studentId, password:$password) { id name email studentId createdAt }
  }
`,
    { name, email, studentId, password },
  );

export const createCourse = (name, code, instructor) =>
  gql(
    `
  mutation($name:String!, $code:String!, $instructor:String!) {
    createCourse(name:$name, code:$code, instructor:$instructor) { id name code instructor createdAt }
  }
`,
    { name, code, instructor },
  );

export const createSession = (courseId, date, location, lateThresholdMinutes) =>
  gql(
    `
  mutation($courseId:ID!, $date:String!, $location:String!, $lateThresholdMinutes:Int) {
    createSession(courseId:$courseId, date:$date, location:$location, lateThresholdMinutes:$lateThresholdMinutes) {
      id date location status lateThresholdMinutes course{ name code }
    }
  }
`,
    {
      courseId,
      date,
      location,
      lateThresholdMinutes: lateThresholdMinutes || 15,
    },
  );

export const openSession = (id) =>
  gql(`mutation($id:ID!){ openSession(id:$id){ id status } }`, { id });
export const closeSession = (id) =>
  gql(`mutation($id:ID!){ closeSession(id:$id){ id status } }`, { id });

export const markAttendance = (studentId, sessionId, status) =>
  gql(
    `
  mutation($studentId:ID!, $sessionId:ID!, $status:AttendanceStatus) {
    markAttendance(studentId:$studentId, sessionId:$sessionId, status:$status) {
      id status markedAt student{ name } session{ date location }
    }
  }
`,
    { studentId, sessionId, status: status || null },
  );

export const markAttendanceBulk = (sessionId, records) =>
  gql(
    `
  mutation($sessionId:ID!, $records:[BulkAttendanceInput!]!) {
    markAttendanceBulk(sessionId:$sessionId, records:$records) {
      successful{ id status markedAt student{ name studentId } session{ location } }
      failed{ studentId reason }
    }
  }
`,
    { sessionId, records },
  );

export const enrollStudent = (studentId, courseId) =>
  gql(
    `mutation($studentId:ID!,$courseId:ID!){ enrollStudent(studentId:$studentId,courseId:$courseId){ id enrolledAt student{name studentId} course{name code} } }`,
    { studentId, courseId },
  );
export const unenrollStudent = (studentId, courseId) =>
  gql(
    `mutation($studentId:ID!,$courseId:ID!){ unenrollStudent(studentId:$studentId,courseId:$courseId) }`,
    { studentId, courseId },
  );

export const deleteStudent = (id) =>
  gql(`mutation($id:ID!){ deleteStudent(id:$id) }`, { id });
export const deleteCourse = (id) =>
  gql(`mutation($id:ID!){ deleteCourse(id:$id) }`, { id });
export const deleteSession = (id) =>
  gql(`mutation($id:ID!){ deleteSession(id:$id) }`, { id });

// ── Export ────────────────────────────────────────────────────────────────────

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: filename,
  });
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportStats() {
  const res = await fetch(`${EXPORT_URL}/stats`, { headers: authHeaders() });
  const blob = await res.blob();
  downloadBlob(
    blob,
    `student_stats_${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}

export async function exportSessionFile(sessionId) {
  const res = await fetch(`${EXPORT_URL}/session/${sessionId}`, {
    headers: authHeaders(),
  });
  const blob = await res.blob();
  downloadBlob(blob, `session_attendance_${sessionId}.xlsx`);
}
