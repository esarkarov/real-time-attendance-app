export const typeDefs = `#graphql
  enum AttendanceStatus {
    PRESENT
    ABSENT
    LATE
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

  # Feature 4 - Student attendance statistics
  type StudentStats {
    student: Student!
    totalSessions: Int!
    present: Int!
    absent: Int!
    late: Int!
    attendanceRate: Float!
  }

  # Feature 3 - Bulk mark input
  input BulkAttendanceInput {
    studentId: ID!
    status: AttendanceStatus!
  }

  # Feature 3 - Bulk mark result
  type BulkAttendanceResult {
    successful: [AttendanceRecord!]!
    failed: [BulkAttendanceError!]!
  }

  type BulkAttendanceError {
    studentId: ID!
    reason: String!
  }

  # Feature 5 - Enrollment
  type Enrollment {
    id: ID!
    student: Student!
    course: Course!
    enrolledAt: String!
  }

  # ─── Queries ───────────────────────────────────────────────────────────────

  type Query {
    # Students — Feature 2: pagination
    students(limit: Int, offset: Int): [Student!]!
    student(id: ID!): Student

    # Courses — Feature 2: pagination
    courses(limit: Int, offset: Int): [Course!]!
    course(id: ID!): Course

    # Sessions — Feature 2: pagination
    sessions(courseId: ID, limit: Int, offset: Int): [Session!]!
    session(id: ID!): Session

    # Attendance — Feature 2: pagination
    attendanceBySession(sessionId: ID!, limit: Int, offset: Int): AttendanceSummary!
    attendanceByStudent(studentId: ID!, limit: Int, offset: Int): [AttendanceRecord!]!

    # Feature 4 - Student stats
    studentStats(studentId: ID!): StudentStats!

    # Feature 5 - Enrollment queries
    enrollmentsByStudent(studentId: ID!): [Enrollment!]!
    enrollmentsByCourse(courseId: ID!): [Enrollment!]!
  }

  # ─── Mutations ─────────────────────────────────────────────────────────────

  type Mutation {
    # Students — Feature 1: email validation
    createStudent(name: String!, email: String!, studentId: String!): Student!
    deleteStudent(id: ID!): Boolean!

    # Courses
    createCourse(name: String!, code: String!, instructor: String!): Course!
    deleteCourse(id: ID!): Boolean!

    # Sessions — Feature 1: prevent past sessions
    createSession(courseId: ID!, date: String!, location: String!): Session!
    deleteSession(id: ID!): Boolean!

    # Attendance — Feature 1: validates enrollment
    markAttendance(studentId: ID!, sessionId: ID!, status: AttendanceStatus!): AttendanceRecord!
    updateAttendance(id: ID!, status: AttendanceStatus!): AttendanceRecord!

    # Feature 3 - Bulk mark attendance
    markAttendanceBulk(sessionId: ID!, records: [BulkAttendanceInput!]!): BulkAttendanceResult!

    # Feature 5 - Enrollment mutations
    enrollStudent(studentId: ID!, courseId: ID!): Enrollment!
    unenrollStudent(studentId: ID!, courseId: ID!): Boolean!
  }

  # ─── Subscriptions ─────────────────────────────────────────────────────────

  type Subscription {
    attendanceMarked(sessionId: ID!): AttendanceRecord!
    attendanceUpdated: AttendanceRecord!
  }
`;
