export const typeDefs = `#graphql

  # ─── Enums ─────────────────────────────────────────────────────────────────

  enum AttendanceStatus {
    PRESENT
    ABSENT
    LATE
  }

  enum UserRole {
    TEACHER
    STUDENT
  }

  enum SessionStatus {
    UPCOMING
    ONGOING
    CLOSED
  }

  # ─── Types ─────────────────────────────────────────────────────────────────

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

    students(limit: Int, offset: Int): [Student!]!
    student(id: ID!): Student

    courses(limit: Int, offset: Int): [Course!]!
    course(id: ID!): Course

    # Sessions can be filtered by status
    sessions(courseId: ID, status: SessionStatus, limit: Int, offset: Int): [Session!]!
    session(id: ID!): Session

    attendanceBySession(sessionId: ID!, limit: Int, offset: Int): AttendanceSummary!
    attendanceByStudent(studentId: ID!, limit: Int, offset: Int): [AttendanceRecord!]!
    myAttendance(limit: Int, offset: Int): [AttendanceRecord!]!

    studentStats(studentId: ID!): StudentStats!

    enrollmentsByStudent(studentId: ID!): [Enrollment!]!
    enrollmentsByCourse(courseId: ID!): [Enrollment!]!
  }

  # ─── Mutations ─────────────────────────────────────────────────────────────

  type Mutation {
    # Auth — public
    register(name: String!, email: String!, password: String!, role: UserRole!, studentId: ID): AuthPayload!
    login(email: String!, password: String!): AuthPayload!

    # Students — TEACHER only
    createStudent(name: String!, email: String!, studentId: String!): Student!
    deleteStudent(id: ID!): Boolean!

    # Courses — TEACHER only
    createCourse(name: String!, code: String!, instructor: String!): Course!
    deleteCourse(id: ID!): Boolean!

    # Sessions — TEACHER only
    createSession(courseId: ID!, date: String!, location: String!, lateThresholdMinutes: Int): Session!
    deleteSession(id: ID!): Boolean!
    openSession(id: ID!): Session!    # UPCOMING → ONGOING
    closeSession(id: ID!): Session!   # ONGOING  → CLOSED

    # Attendance — TEACHER only (session must be ONGOING)
    markAttendance(studentId: ID!, sessionId: ID!, status: AttendanceStatus): AttendanceRecord!
    updateAttendance(id: ID!, status: AttendanceStatus!): AttendanceRecord!
    markAttendanceBulk(sessionId: ID!, records: [BulkAttendanceInput!]!): BulkAttendanceResult!

    # Enrollment — TEACHER only
    enrollStudent(studentId: ID!, courseId: ID!): Enrollment!
    unenrollStudent(studentId: ID!, courseId: ID!): Boolean!
  }

  # ─── Subscriptions ─────────────────────────────────────────────────────────

  type Subscription {
    attendanceMarked(sessionId: ID!): AttendanceRecord!
    attendanceUpdated: AttendanceRecord!
  }
`;
