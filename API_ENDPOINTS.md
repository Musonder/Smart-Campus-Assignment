# Argos API Endpoints - Complete Reference

## 🔌 Base URLs

| Service | Base URL | Status |
|---------|----------|--------|
| API Gateway | `http://localhost:8000` | ✅ Running |
| User Service | `http://localhost:8001` | ✅ Running |
| Academic Service | `http://localhost:8002` | ✅ Running |
| Analytics Service | `http://localhost:8004` | ✅ Running |
| Facility Service | `http://localhost:8005` | ✅ Running |

**Note**: Frontend connects to API Gateway (port 8000) which proxies to all services.

---

## 🔐 Authentication Endpoints

### Register User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "student@university.edu",
  "password": "Student123!",
  "first_name": "John",
  "last_name": "Doe",
  "user_type": "student",  // student, lecturer, staff, admin
  "student_id": "STU001",  // for students
  "employee_id": "EMP001", // for lecturer/staff/admin
  "department": "Computer Science"
}
```

### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "student@university.edu",
  "password": "Student123!"
}

Response:
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 1800,
  "user_id": "uuid..."
}
```

### Refresh Token
```http
POST /api/v1/auth/refresh
Authorization: Bearer <refresh_token>
```

### Logout
```http
POST /api/v1/auth/logout
Authorization: Bearer <access_token>
```

---

## 👤 User Endpoints

### Get Current User
```http
GET /api/v1/users/me
Authorization: Bearer <access_token>

Response:
{
  "id": "uuid...",
  "email": "student@university.edu",
  "first_name": "John",
  "last_name": "Doe",
  "full_name": "John Doe",
  "user_type": "student",
  "roles": [],
  "attached_roles": [],
  "is_active": true,
  "email_verified": false,
  "created_at": "2024-...",
  "last_login_at": "2024-..."
}
```

---

## 📚 Academic Endpoints (Students)

### List Courses
```http
GET /api/v1/academic/courses?limit=10&skip=0
Authorization: Bearer <access_token>

Response: Array of Course objects
```

### Get Course Details
```http
GET /api/v1/academic/courses/{course_id}
Authorization: Bearer <access_token>
```

### List Sections
```http
GET /api/v1/academic/sections?course_code=CS-101&semester=Fall 2024
Authorization: Bearer <access_token>

Response: Array of Section objects with schedule
```

### Get My Enrollments
```http
GET /api/v1/academic/enrollments
Authorization: Bearer <access_token>

Response: Array with schedule data:
[
  {
    "id": "uuid...",
    "course_code": "CS-101",
    "course_title": "Introduction to Computer Science",
    "section_number": "001",
    "semester": "Fall 2024",
    "enrollment_status": "enrolled",
    "is_waitlisted": false,
    "current_grade_percentage": 85.5,
    "current_letter_grade": "B+",
    "schedule_days": ["Monday", "Wednesday", "Friday"],
    "start_time": "09:00",
    "end_time": "10:30",
    "room_id": "uuid...",
    "instructor_id": "uuid..."
  }
]
```

### Enroll in Section
```http
POST /api/v1/academic/enrollments
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "student_id": "uuid...",
  "section_id": "uuid..."
}
```

### Drop Enrollment
```http
DELETE /api/v1/academic/enrollments/{enrollment_id}
Authorization: Bearer <access_token>
```

---

## 👨‍🏫 Lecturer Endpoints

### Get My Sections (Taught Courses)
```http
GET /api/v1/lecturer/sections
Authorization: Bearer <lecturer_access_token>

Response: Array of sections taught by lecturer
[
  {
    "id": "uuid...",
    "course_code": "CS-101",
    "course_title": "Intro to CS",
    "section_number": "001",
    "semester": "Fall 2024",
    "current_enrollment": 25,
    "max_enrollment": 30,
    "schedule_days": ["Mon", "Wed", "Fri"],
    "start_time": "09:00",
    "end_time": "10:30"
  }
]
```

### Get My Assessments
```http
GET /api/v1/lecturer/assessments
Authorization: Bearer <lecturer_access_token>
```

### Get Enrolled Students
```http
GET /api/v1/lecturer/students?section_id={section_id}
Authorization: Bearer <lecturer_access_token>
```

---

## 👷 Staff Endpoints

### Get Facilities
```http
GET /api/v1/staff/facilities
Authorization: Bearer <staff_access_token>
```

---

## 👨‍💼 Admin Endpoints

### List All Users
```http
GET /api/v1/admin/users?user_type=student&limit=100&offset=0
Authorization: Bearer <admin_access_token>

Response: Array of all users
```

### Get User Statistics
```http
GET /api/v1/admin/users/stats
Authorization: Bearer <admin_access_token>

Response:
{
  "total_users": 150,
  "active_users": 145,
  "inactive_users": 5,
  "by_type": {
    "student": 120,
    "lecturer": 20,
    "staff": 8,
    "admin": 2
  }
}
```

### Activate User
```http
PATCH /api/v1/admin/users/{user_id}/activate
Authorization: Bearer <admin_access_token>
```

### Deactivate User
```http
PATCH /api/v1/admin/users/{user_id}/deactivate
Authorization: Bearer <admin_access_token>
```

---

## 🏢 Facilities Endpoints (All Users)

### List Rooms
```http
GET /api/v1/facilities/rooms?is_available=true&min_capacity=20
Authorization: Bearer <access_token>

Response: Array of rooms
[
  {
    "id": "uuid...",
    "facility_name": "Science Building",
    "room_number": "SCI-101",
    "room_type": "classroom",
    "capacity": 30,
    "current_occupancy": 0,
    "is_available": true,
    "has_projector": true,
    "has_whiteboard": true,
    "has_computers": false,
    "has_wifi": true,
    "has_video_conference": false,
    "floor": 1
  }
]
```

### Create Room Booking
```http
POST /api/v1/facilities/bookings
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "room_id": "uuid...",
  "date": "2024-11-15",
  "time": "14:00",
  "duration": 2
}
```

---

## 📊 Analytics Endpoints

### Predict Enrollment
```http
POST /api/v1/analytics/predict/enrollment
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "course_code": "CS-101",
  "semester": "Spring 2025"
}
```

### Optimize Room Allocation
```http
POST /api/v1/analytics/optimize/rooms
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "sections": [...],
  "rooms": [...]
}
```

---

## 🔒 Authorization

All endpoints (except register/login) require JWT authentication:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Role-Based Access
- **Student**: Can access student endpoints only
- **Lecturer**: Can access student + lecturer endpoints
- **Staff**: Can access staff-specific endpoints
- **Admin**: Can access all endpoints

---

## ✅ Real API Integration - No Mocks!

### What's Working
✅ User registration with all role types  
✅ JWT authentication with role validation  
✅ Course browsing and enrollment  
✅ Enrollment management with policy validation  
✅ Timetable generation from real schedule data  
✅ Facilities browsing and room booking  
✅ Lecturer course management  
✅ Admin user management  
✅ Real-time data from PostgreSQL  

### All Data is Real
- ✅ Users stored in PostgreSQL
- ✅ Courses and sections from database
- ✅ Enrollments with real policy validation
- ✅ Schedule data from section assignments
- ✅ Room data from facility database
- ✅ JWT tokens with real claims

### No Mock Data
- ❌ No hardcoded users
- ❌ No fake schedules
- ❌ No mock facilities
- ❌ No seeded data

**Everything comes from real database queries!**

---

## 📝 Testing Guide

### 1. Register Users (Different Roles)

**Student:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@university.edu",
    "password": "Student123!",
    "first_name": "John",
    "last_name": "Doe",
    "user_type": "student",
    "student_id": "STU001",
    "major": "Computer Science"
  }'
```

**Lecturer:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "lecturer@university.edu",
    "password": "Lecturer123!",
    "first_name": "Jane",
    "last_name": "Smith",
    "user_type": "lecturer",
    "employee_id": "LEC001",
    "department": "Computer Science"
  }'
```

**Admin:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@university.edu",
    "password": "Admin123!",
    "first_name": "Admin",
    "last_name": "User",
    "user_type": "admin",
    "employee_id": "ADM001",
    "department": "Administration"
  }'
```

### 2. Login and Get Token
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "student@university.edu", "password": "Student123!"}'
```

### 3. Use Token for API Calls
```bash
TOKEN="your_access_token_here"

# Get current user
curl http://localhost:8000/api/v1/users/me \
  -H "Authorization: Bearer $TOKEN"

# List courses
curl http://localhost:8000/api/v1/academic/courses \
  -H "Authorization: Bearer $TOKEN"

# Get enrollments
curl http://localhost:8000/api/v1/academic/enrollments \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🚀 Service Ports

| Service | Port | Purpose |
|---------|------|---------|
| Frontend | 5173 | React UI |
| API Gateway | 8000 | Unified API |
| User Service | 8001 | Auth & Users |
| Academic Service | 8002 | Courses & Enrollment |
| Analytics Service | 8004 | ML Predictions |
| Facility Service | 8005 | Rooms & Booking |

---

## 📊 Database Connections

| Database | Port | Purpose |
|----------|------|---------|
| PostgreSQL | 5432 | User data, courses, enrollments |
| MongoDB | 27017 | Event store, audit logs |
| Redis | 6379 | Caching, sessions |
| Kafka | 9092 | Event streaming |

---

## ✨ Features

### Policy-Based Enrollment
When a student tries to enroll, the system checks:
- ✅ Prerequisites completed
- ✅ No schedule conflicts
- ✅ Section capacity available
- ✅ Credit hour limits
- ✅ Academic standing

### Real-Time Schedule
- ✅ Timetable built from actual section schedules
- ✅ Days, times, rooms from database
- ✅ No hardcoded data

### Role-Based Access
- ✅ JWT tokens include user_type claim
- ✅ Endpoints verify role before allowing access
- ✅ 403 Forbidden if wrong role tries to access

---

## 🎯 Summary

**All endpoints are REAL and working!**
- ✅ No mock data
- ✅ No hardcoded values
- ✅ No seeding required
- ✅ Real database queries
- ✅ Real JWT authentication
- ✅ Real policy validation

**You enter data through the UI and APIs!**

