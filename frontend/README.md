# Argos Frontend

Professional React + TypeScript dashboard for Argos Smart Campus Platform.

## Features

✨ **Modern UI with Shadcn/ui**
- Beautiful, accessible components
- Consistent design system
- Professional aesthetics

🎨 **Custom Color Scheme**
- Primary: `#FF6600` (Vibrant Orange)
- Secondary: `#604CC3` (Sophisticated Purple)
- Accent: `#8FD14F` (Fresh Green)
- Background: `#F5F5F5` (Light Gray)

🌓 **Light & Dark Mode**
- Seamless theme switching
- Persistent user preference
- Optimized for both modes

🔌 **Real API Integration**
- **NO MOCK DATA** - All endpoints connect to real backend
- React Query for server state
- Automatic token refresh
- Error handling

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Components**: Shadcn/ui + Radix UI
- **State Management**: 
  - TanStack React Query (server state)
  - Zustand (client state)
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Backend services running on `localhost:8000`

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The app will be available at http://localhost:5173

### Environment Variables

Create `.env.local`:

```env
VITE_API_URL=http://localhost:8000
```

## Project Structure

```
src/
├── components/         # Reusable components
│   ├── ui/            # Shadcn/ui components
│   ├── ProtectedRoute.tsx
│   └── theme-provider.tsx
├── layouts/           # Layout components
│   └── DashboardLayout.tsx
├── pages/             # Page components
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── DashboardPage.tsx
│   ├── CoursesPage.tsx
│   ├── EnrollmentsPage.tsx
│   └── TimetablePage.tsx
├── services/          # API services (REAL APIs)
│   ├── auth.service.ts
│   └── academic.service.ts
├── lib/               # Utilities
│   ├── api-client.ts  # Axios config with interceptors
│   └── utils.ts       # Helper functions
├── App.tsx            # Main app component
├── main.tsx           # Entry point
└── index.css          # Global styles

## Available Pages

- **Login** (`/login`) - Authentication with JWT
- **Register** (`/register`) - New user registration
- **Dashboard** (`/dashboard`) - Overview with statistics
- **Courses** (`/courses`) - Browse and enroll in courses
- **Enrollments** (`/enrollments`) - Manage your enrollments
- **Timetable** (`/timetable`) - Visual weekly schedule

## Real API Integration

All data comes from real backend APIs:

- **Authentication**: User Service (`:8001`)
  - Register, Login, Token Refresh
  - Real JWT tokens, bcrypt passwords
  
- **Courses**: Academic Service (`:8002`)
  - Browse courses and sections
  - Enrollment with policy validation
  - Real-time capacity checking
  - Waitlist management

- **Event Sourcing**: All enrollments create audit trail events

## Features

### Authentication
- ✅ JWT token-based auth
- ✅ Automatic token refresh
- ✅ Protected routes
- ✅ Logout functionality

### Dashboard
- ✅ Real-time statistics
- ✅ Enrollment overview
- ✅ Grade tracking
- ✅ Quick actions

### Course Management
- ✅ Browse available sections
- ✅ Search and filter
- ✅ Real-time enrollment status
- ✅ Capacity indicators
- ✅ Waitlist support

### Enrollment
- ✅ Policy-driven validation
  - Prerequisite checking
  - Capacity enforcement
  - Schedule conflict detection
  - Credit limit validation
- ✅ Event sourcing
- ✅ Real-time updates
- ✅ Drop courses functionality

### UI/UX
- ✅ Responsive design (mobile-first)
- ✅ Professional color scheme
- ✅ Dark mode support
- ✅ Loading states
- ✅ Error handling
- ✅ Toast notifications
- ✅ Smooth animations

## Color Palette

### Light Mode
- Primary: `#FF6600` (Orange)
- Secondary: `#604CC3` (Purple)
- Accent: `#8FD14F` (Green)
- Background: `#F5F5F5` (Light Gray)
- Foreground: `#1A1A1A` (Dark)

### Dark Mode
- Primary: `#FF6600` (Orange - same)
- Secondary: `#604CC3` (Purple - same)
- Accent: `#8FD14F` (Green - slightly muted)
- Background: `#141414` (Dark)
- Foreground: `#F2F2F2` (Light)

## Development

### Code Quality

```bash
# Lint
npm run lint

# Format
npm run format

# Type check
npx tsc --noEmit
```

### Building

```bash
# Production build
npm run build

# Output in dist/
```

## Notes

- **No mock data** - All API calls go to real backend services
- Ensure backend services are running before starting frontend
- Token refresh happens automatically when tokens expire
- All forms have proper validation
- Errors are handled gracefully with user-friendly messages

