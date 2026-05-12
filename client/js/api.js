// api.js — GraphQL HTTP client

const API_URL = 'http://localhost:4000/graphql';

export async function gql(query, variables = {}) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  return res.json();
}

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
      id date location
      course { id name code instructor }
    }
  }
`, { limit, offset });

export const getAttendanceSummary = (sessionId) => gql(`
  query($sessionId: ID!) {
    attendanceBySession(sessionId: $sessionId) {
      totalPresent totalAbsent totalLate
      session { date location course { name } }
      records {
        status markedAt
        student { name studentId }
      }
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

export const markAttendance = (studentId, sessionId, status) => gql(`
  mutation($studentId: ID!, $sessionId: ID!, $status: AttendanceStatus!) {
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
      successful {
        id status markedAt
        student { name studentId }
        session { location }
      }
      failed { studentId reason }
    }
  }
`, { sessionId, records });

export const enrollStudent = (studentId, courseId) => gql(`
  mutation($studentId: ID!, $courseId: ID!) {
    enrollStudent(studentId: $studentId, courseId: $courseId) {
      id enrolledAt
      student { name studentId }
      course { name code }
    }
  }
`, { studentId, courseId });

export const unenrollStudent = (studentId, courseId) => gql(`
  mutation($studentId: ID!, $courseId: ID!) {
    unenrollStudent(studentId: $studentId, courseId: $courseId)
  }
`, { studentId, courseId });
