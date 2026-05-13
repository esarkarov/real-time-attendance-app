# Real-time Attendance System

A GraphQL-based real-time attendance tracking system built with Apollo Server, WebSocket subscriptions, MongoDB, and JWT authentication.

---

## Tech Stack

| Layer           | Technology                                         |
| --------------- | -------------------------------------------------- |
| Runtime         | Node.js + TypeScript                               |
| GraphQL Server  | Apollo Server 4                                    |
| Real-time       | GraphQL Subscriptions via `graphql-ws` (WebSocket) |
| Database        | MongoDB + Mongoose                                 |
| Authentication  | JWT + bcryptjs                                     |
| Schema Explorer | GraphQL Voyager                                    |
| Export          | ExcelJS (.xlsx)                                    |
| Test Client     | Plain HTML/JS (ES Modules)                         |

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/real-time-attendance?retryWrites=true&w=majority
PORT=4000
JWT_SECRET=your_super_secret_key_here
```

### 3. Seed sample data

```bash
npm run seed
```

### 4. Start the server

```bash
npm run dev        # development (hot reload)
npm run build      # compile TypeScript
npm start          # production
```

---

## Endpoints

| Endpoint                                   | Description                          |
| ------------------------------------------ | ------------------------------------ |
| `http://localhost:4000/graphql`            | GraphQL API + Apollo Sandbox         |
| `ws://localhost:4000/graphql`              | WebSocket subscriptions              |
| `http://localhost:4000/voyager`            | Interactive schema explorer          |
| `http://localhost:4000/health`             | Health check                         |
| `http://localhost:4000/export/stats`       | Download student stats as .xlsx      |
| `http://localhost:4000/export/session/:id` | Download session attendance as .xlsx |

---

## Authentication

All queries and mutations (except `login` and `register`) require a Bearer token.

**Register:**

```graphql
mutation {
  register(
    name: "Prof. Martin"
    email: "martin@ufaz.az"
    password: "pass123"
    role: TEACHER
  ) {
    token
    user {
      id
      name
      role
    }
  }
}
```

**Login:**

```graphql
mutation {
  login(email: "martin@ufaz.az", password: "pass123") {
    token
    user {
      id
      name
      role
    }
  }
}
```

Add the token to the `Authorization` header:

```
Authorization: Bearer <token>
```

---

## Roles

| Role      | Permissions                                                                        |
| --------- | ---------------------------------------------------------------------------------- |
| `TEACHER` | Full access — manage students, courses, sessions, attendance, enrollments, exports |
| `STUDENT` | Read-only — view own attendance (`myAttendance`), own stats, courses, sessions     |

---

## GraphQL Operations

### Queries

```graphql
# Fetch data (TEACHER)
students(limit: Int, offset: Int): [Student!]!
courses(limit: Int, offset: Int): [Course!]!
sessions(courseId: ID, status: SessionStatus, limit: Int, offset: Int): [Session!]!
attendanceBySession(sessionId: ID!): AttendanceSummary!
attendanceByStudent(studentId: ID!): [AttendanceRecord!]!
studentStats(studentId: ID!): StudentStats!
enrollmentsByStudent(studentId: ID!): [Enrollment!]!
enrollmentsByCourse(courseId: ID!): [Enrollment!]!

# Student only
myAttendance(limit: Int, offset: Int): [AttendanceRecord!]!
```

### Mutations

```graphql
# Auth (public)
register(name, email, password, role, studentId?): AuthPayload!
login(email, password): AuthPayload!

# Sessions (TEACHER)
createSession(courseId, date, location, lateThresholdMinutes?): Session!
openSession(id): Session!    # UPCOMING → ONGOING
closeSession(id): Session!   # ONGOING  → CLOSED

# Attendance (TEACHER — session must be ONGOING)
markAttendance(studentId, sessionId, status?): AttendanceRecord!
markAttendanceBulk(sessionId, records: [{ studentId, status }]): BulkAttendanceResult!
updateAttendance(id, status): AttendanceRecord!

# Enrollment (TEACHER)
enrollStudent(studentId, courseId): Enrollment!
unenrollStudent(studentId, courseId): Boolean!
```

### Subscriptions

```graphql
# Watch a specific session (TEACHER)
subscription ($sessionId: ID!) {
  attendanceMarked(sessionId: $sessionId) {
    id
    status
    markedAt
    student {
      name
      studentId
    }
  }
}

# Watch all sessions (TEACHER)
subscription {
  attendanceUpdated {
    id
    status
    markedAt
    student {
      name
      studentId
    }
    session {
      date
      location
    }
  }
}
```

---

## Session Lifecycle

```
UPCOMING ──→ openSession ──→ ONGOING ──→ closeSession ──→ CLOSED
```

Attendance can only be marked when a session is `ONGOING`. Marking attendance after the `lateThresholdMinutes` (default: 15 min) automatically sets status to `LATE`.

---

## Architecture

```
Client (HTTP)              Client (WebSocket)
      │                           │
      ▼                           ▼
Apollo Server 4           graphql-ws server
      │                           │
      └─────────────┬─────────────┘
                    │
             GraphQL Schema
          (typeDefs + resolvers)
                    │
          ┌─────────┼─────────┐
          │         │         │
       MongoDB    PubSub     JWT
      (Mongoose) (events)   (auth)
                    │
         fires on markAttendance
         → broadcasts to all
           subscribed clients
```

---
