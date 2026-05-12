# Smart Attendance System
**Group 4** — Elvin Sarkarov, Elbay Mammadov, Roza Huseynzada  
Distributed Programming (M1 DSAI) — UFAZ

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js + TypeScript |
| GraphQL Server | Apollo Server 4 |
| Real-time | GraphQL Subscriptions via `graphql-ws` (WebSocket) |
| Database | MongoDB + Mongoose |
| Test Client | Plain HTML/JS |

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env and set your MongoDB Atlas connection string
```

### 3. Seed sample data
```bash
npm run seed
```

### 4. Start the server
```bash
npm run dev        # development (hot reload)
npm start          # production (after npm run build)
```

Server runs at:
- **GraphQL API:** http://localhost:4000/graphql
- **Subscriptions:** ws://localhost:4000/graphql
- **Health check:** http://localhost:4000/health
- **Test client:** open `client/index.html` in a browser

---

## Example Queries

### Get all students
```graphql
query {
  students {
    id
    name
    email
    studentId
  }
}
```

### Get all sessions with course info
```graphql
query {
  sessions {
    id
    date
    location
    course {
      name
      code
      instructor
    }
  }
}
```

### Attendance summary for a session
```graphql
query($sessionId: ID!) {
  attendanceBySession(sessionId: $sessionId) {
    totalPresent
    totalAbsent
    totalLate
    session {
      date
      location
      course { name }
    }
    records {
      status
      markedAt
      student { name studentId }
    }
  }
}
```

### Mark attendance
```graphql
mutation($studentId: ID!, $sessionId: ID!, $status: AttendanceStatus!) {
  markAttendance(studentId: $studentId, sessionId: $sessionId, status: $status) {
    id
    status
    markedAt
    student { name }
    session { date location }
  }
}
```

### Real-time subscription (watch a session)
```graphql
subscription($sessionId: ID!) {
  attendanceMarked(sessionId: $sessionId) {
    id
    status
    markedAt
    student { name studentId }
  }
}
```

### Real-time subscription (watch all sessions)
```graphql
subscription {
  attendanceUpdated {
    id
    status
    markedAt
    student { name studentId }
    session { date location }
  }
}
```

---

## Architecture

```
Client (HTTP)          Client (WebSocket)
     │                        │
     ▼                        ▼
Apollo Server 4        graphql-ws server
     │                        │
     └──────────┬─────────────┘
                │
         GraphQL Schema
         (typeDefs + resolvers)
                │
         ┌──────┴──────┐
         │             │
      MongoDB        PubSub
     (Mongoose)   (in-memory)
                      │
              triggers on markAttendance
              → broadcasts to subscribers
```

The **Subscription** layer demonstrates distributed/async communication:  
when `markAttendance` is called, the PubSub event is published and all connected  
WebSocket clients subscribed to that session receive the update in real-time.
