/**
 * Argos Main Application Component
 * 
 * Professional Smart Campus Dashboard
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from 'sonner'

// Pages - Public
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { ProtectedRoute } from '@/components/ProtectedRoute'

// Pages - Student
import { CoursesPage } from '@/pages/CoursesPage'
import { EnrollmentsPage } from '@/pages/EnrollmentsPage'
import { TimetablePage } from '@/pages/TimetablePage'
import { FacilitiesPage } from '@/pages/FacilitiesPage'

// Pages - Lecturer
import { LecturerCoursesPage } from '@/pages/lecturer/CoursesPage'
import { LecturerGradingPage } from '@/pages/lecturer/GradingPage'
import { LecturerStudentsPage } from '@/pages/lecturer/StudentsPage'
import { LecturerSchedulePage } from '@/pages/lecturer/SchedulePage'
import { LecturerReportsPage } from '@/pages/lecturer/ReportsPage'

// Pages - Staff
import { StaffFacilitiesPage } from '@/pages/staff/FacilitiesPage'

// Pages - Admin
import { AdminUsersPage } from '@/pages/admin/UsersPage'
import { AdminCoursesPage } from '@/pages/admin/CoursesPage'
import { AdminFacilitiesPage } from '@/pages/admin/FacilitiesPage'
import { AdminDashboardPage } from '@/pages/admin/DashboardPage'
import { AdminAnalyticsPage } from '@/pages/admin/AnalyticsPage'
import { AdminSecurityPage } from '@/pages/admin/SecurityPage'
import { AdminReportsPage } from '@/pages/admin/ReportsPage'
import { AdminSettingsPage } from '@/pages/admin/SettingsPage'
import { AdminEnrollmentsPage } from '@/pages/admin/EnrollmentsPage'

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="argos-theme">
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              
              {/* Student Routes */}
              <Route path="courses" element={<CoursesPage />} />
              <Route path="enrollments" element={<EnrollmentsPage />} />
              <Route path="timetable" element={<TimetablePage />} />
              <Route path="facilities" element={<FacilitiesPage />} />
              
              {/* Lecturer Routes */}
              <Route path="lecturer/courses" element={<LecturerCoursesPage />} />
              <Route path="lecturer/grading" element={<LecturerGradingPage />} />
              <Route path="lecturer/students" element={<LecturerStudentsPage />} />
              <Route path="lecturer/schedule" element={<LecturerSchedulePage />} />
              <Route path="lecturer/reports" element={<LecturerReportsPage />} />
              
              {/* Staff Routes */}
              <Route path="staff/facilities" element={<StaffFacilitiesPage />} />
              <Route path="staff/bookings" element={<div className="p-6"><h1 className="text-2xl font-bold">Room Bookings</h1></div>} />
              <Route path="staff/maintenance" element={<div className="p-6"><h1 className="text-2xl font-bold">Maintenance</h1></div>} />
              <Route path="staff/reports" element={<div className="p-6"><h1 className="text-2xl font-bold">Staff Reports</h1></div>} />
              
              {/* Admin Routes */}
              <Route path="admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="admin/users" element={<AdminUsersPage />} />
              <Route path="admin/courses" element={<AdminCoursesPage />} />
              <Route path="admin/enrollments" element={<AdminEnrollmentsPage />} />
              <Route path="admin/facilities" element={<AdminFacilitiesPage />} />
              <Route path="admin/analytics" element={<AdminAnalyticsPage />} />
              <Route path="admin/security" element={<AdminSecurityPage />} />
              <Route path="admin/audit" element={<AdminSecurityPage />} />
              <Route path="admin/reports" element={<AdminReportsPage />} />
              <Route path="admin/settings" element={<AdminSettingsPage />} />
            </Route>

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>

        {/* Toast notifications */}
        <Toaster position="top-right" richColors />
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App

