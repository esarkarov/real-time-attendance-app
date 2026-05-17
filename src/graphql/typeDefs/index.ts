export const typeDefs = `#graphql

  enum AttendanceStatus { PRESENT  ABSENT  LATE }
  enum UserRole         { TEACHER  STUDENT }
  enum SessionStatus    { UPCOMING ONGOING CLOSED }

  type User {
    id: ID!
    name: String!
    email: String!
    role: UserRole!
    studentId: ID
    createdAt: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Student {
    id: ID!
    name: String!
    email: String!
    studentId: String!
    createdAt: String!
  }

  type Course {
    id: ID!
    name: String!
    code: String!
    instructor: String!
    createdAt: String!
  }

  type Session {
    id: ID!
    course: Course!
    date: String!
    location: String!
    status: SessionStatus!
    lateThresholdMinutes: Int!
    createdAt: String!
  }

  type AttendanceRecord {
    id: ID!
    student: Student!
    session: Session!
    status: AttendanceStatus!
    markedAt: String!
  }

  type AttendanceLog {
    id: ID!
    attendanceRecordId: ID!
    changedBy: User!
    previousStatus: String!
    newStatus: String!
    changedAt: String!
  }

  type AttendanceSummary {
    sessionId: ID!
    session: Session!
    totalPresent: Int!
    totalAbsent: Int!
    totalLate: Int!
    records: [AttendanceRecord!]!
  }

  type StudentStats {
    student: Student!
    totalSessions: Int!
    present: Int!
    absent: Int!
    late: Int!
    attendanceRate: Float!
  }

  type DashboardStats {
    totalStudents: Int!
    totalCourses: Int!
    totalSessions: Int!
    ongoingSessions: Int!
    totalAttendanceRecords: Int!
    overallAttendanceRate: Float!
  }

  input BulkAttendanceInput {
    studentId: ID!
    status: AttendanceStatus!
  }

  type BulkAttendanceResult {
    successful: [AttendanceRecord!]!
    failed: [BulkAttendanceError!]!
  }

  type BulkAttendanceError {
    studentId: ID!
    reason: String!
  }

  type Enrollment {
    id: ID!
    student: Student!
    course: Course!
    enrolledAt: String!
  }

  # ─── Queries ───────────────────────────────────────────────────────────────

  type Query {
    me: User!
    dashboardStats: DashboardStats!

    students(limit: Int, offset: Int): [Student!]!
    student(id: ID!): Student

    courses(limit: Int, offset: Int): [Course!]!
    course(id: ID!): Course

    sessions(courseId: ID, status: SessionStatus, limit: Int, offset: Int): [Session!]!
    session(id: ID!): Session

    attendanceBySession(sessionId: ID!, limit: Int, offset: Int): AttendanceSummary!
    attendanceByStudent(studentId: ID!, limit: Int, offset: Int): [AttendanceRecord!]!
    myAttendance(limit: Int, offset: Int): [AttendanceRecord!]!
    attendanceLogs(attendanceRecordId: ID!): [AttendanceLog!]!

    studentStats(studentId: ID!): StudentStats!

    enrollmentsByStudent(studentId: ID!): [Enrollment!]!
    enrollmentsByCourse(courseId: ID!): [Enrollment!]!
  }

  # ─── Mutations ─────────────────────────────────────────────────────────────

  type Mutation {
    # Teachers register themselves. Students are created by teachers.
    register(name: String!, email: String!, password: String!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    changePassword(oldPassword: String!, newPassword: String!): Boolean!

    # createStudent also creates the student's login account (password set by teacher)
    createStudent(name: String!, email: String!, studentId: String!, password: String!): Student!
    updateStudent(id: ID!, name: String, email: String, studentId: String): Student!
    deleteStudent(id: ID!): Boolean!

    createCourse(name: String!, code: String!, instructor: String!): Course!
    updateCourse(id: ID!, name: String, code: String, instructor: String): Course!
    deleteCourse(id: ID!): Boolean!

    createSession(courseId: ID!, date: String!, location: String!, lateThresholdMinutes: Int): Session!
    deleteSession(id: ID!): Boolean!
    openSession(id: ID!): Session!
    closeSession(id: ID!): Session!

    markAttendance(studentId: ID!, sessionId: ID!, status: AttendanceStatus): AttendanceRecord!
    updateAttendance(id: ID!, status: AttendanceStatus!): AttendanceRecord!
    markAttendanceBulk(sessionId: ID!, records: [BulkAttendanceInput!]!): BulkAttendanceResult!

    enrollStudent(studentId: ID!, courseId: ID!): Enrollment!
    unenrollStudent(studentId: ID!, courseId: ID!): Boolean!
  }

  # ─── Subscriptions ─────────────────────────────────────────────────────────

  type Subscription {
    attendanceMarked(sessionId: ID!): AttendanceRecord!
    attendanceUpdated: AttendanceRecord!
  }
`;
