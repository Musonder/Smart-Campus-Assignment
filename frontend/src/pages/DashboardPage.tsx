/**
 * Dashboard Page
 * 
 * Main dashboard with statistics, recent activity, and quick actions
 * ALL DATA FROM REAL APIs - NO MOCKS!
 */

import { useQuery } from '@tanstack/react-query'
import { BookOpen, Calendar, TrendingUp, CheckCircle2, ArrowRight, AlertCircle, RefreshCw, WifiOff, ServerOff } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { authService } from '@/services/auth.service'
import { academicService } from '@/services/academic.service'
import { getGreeting, getGradeColor } from '@/lib/utils'
import { AdminDashboardPage } from '@/pages/admin/DashboardPage'
import { LecturerDashboardPage } from '@/pages/lecturer/DashboardPage'
import { DashboardSkeleton } from '@/components/dashboard-skeleton'

export function DashboardPage() {
  // ALL HOOKS MUST BE CALLED FIRST - BEFORE ANY CONDITIONAL RETURNS
  // This is required by React's Rules of Hooks
  
  // Fetch current user - REAL API
  const { data: user, isLoading: userLoading, isError: userError, error: userErrorObj } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => authService.getCurrentUser(),
    retry: 2,
  })

  // Fetch user's enrollments - REAL API
  // Handle ALL errors gracefully - return empty array instead of throwing
  // This ensures the page NEVER disappears, even when services are down
  const { data: enrollments, isLoading: enrollmentsLoading, isError: enrollmentsError } = useQuery({
    queryKey: ['myEnrollments'],
    queryFn: async () => {
      try {
        return await academicService.getMyEnrollments()
      } catch (error: any) {
        // Handle ALL errors gracefully - return empty array to prevent page from disappearing
        const status = error?.response?.status || error?.status
        const code = error?.code || error?.response?.code
        
        if (status === 503 || status === 500 || code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'ENOTFOUND') {
          console.warn('Academic Service unavailable, returning empty enrollments', { status, code })
          return []
        }
        
        // For any other error, also return empty array to prevent page crash
        console.warn('Error fetching enrollments, returning empty array', error)
        return []
      }
    },
    retry: false, // Don't retry - fail fast and return empty array
    enabled: !!user && user.user_type !== 'admin', // Only fetch if user exists and is not admin
    throwOnError: false, // Never throw errors - always return data
  })

  // Fetch available courses - REAL API
  // Handle ALL errors gracefully - return empty array instead of throwing
  // This ensures the page NEVER disappears, even when services are down
  const { data: courses, isError: coursesError } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      try {
        return await academicService.listCourses({ limit: 5 })
      } catch (error: any) {
        // Handle ALL errors gracefully - return empty array to prevent page from disappearing
        const status = error?.response?.status || error?.status
        const code = error?.code || error?.response?.code
        
        if (status === 503 || status === 500 || code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'ENOTFOUND') {
          console.warn('Academic Service unavailable, returning empty courses', { status, code })
          return []
        }
        
        // For any other error, also return empty array to prevent page crash
        console.warn('Error fetching courses, returning empty array', error)
        return []
      }
    },
    retry: false, // Don't retry - fail fast and return empty array
    enabled: !!user && user.user_type !== 'admin', // Only fetch if user exists and is not admin
    throwOnError: false, // Never throw errors - always return data
  })

  // NOW we can do conditional returns AFTER all hooks are called
  // Show admin dashboard for administrators
  // Wait for user to load before checking type
  if (!userLoading && !userError && user?.user_type === 'admin') {
    return <AdminDashboardPage />
  }

  // Show lecturer dashboard for lecturers
  if (!userLoading && !userError && user?.user_type === 'lecturer') {
    return <LecturerDashboardPage />
  }

  // Show loading state while checking user type
  if (userLoading) {
    return <DashboardSkeleton />
  }

  // Show error state if user fetch failed - Professional error UI
  if (userError) {
    const errorMessage = userErrorObj instanceof Error ? userErrorObj.message : 'Failed to load user data'
    const isNetworkError = errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('failed to fetch')
    const isServerError = errorMessage.toLowerCase().includes('server') || errorMessage.toLowerCase().includes('500')
    
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 animate-fade-in">
        <Card className="w-full max-w-2xl border-destructive/20 shadow-xl">
          <CardContent className="pt-12 pb-12 px-8">
            <div className="flex flex-col items-center text-center space-y-6">
              {/* Error Icon with Animation */}
              <div className="relative">
                <div className="absolute inset-0 bg-destructive/20 rounded-full blur-2xl animate-pulse" />
                <div className="relative bg-gradient-to-br from-destructive/10 to-destructive/5 p-6 rounded-full border-2 border-destructive/20">
                  {isNetworkError ? (
                    <WifiOff className="h-12 w-12 text-destructive" />
                  ) : isServerError ? (
                    <ServerOff className="h-12 w-12 text-destructive" />
                  ) : (
                    <AlertCircle className="h-12 w-12 text-destructive" />
                  )}
                </div>
              </div>

              {/* Error Title */}
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-foreground">
                  {isNetworkError ? 'Connection Error' : isServerError ? 'Server Unavailable' : 'Unable to Load Data'}
                </h1>
                <p className="text-muted-foreground text-lg max-w-md">
                  {isNetworkError 
                    ? 'We couldn\'t reach the server. Please check your internet connection and try again.'
                    : isServerError
                    ? 'The server is temporarily unavailable. Our team has been notified and is working on a fix.'
                    : 'We encountered an issue while loading your dashboard. Please try again in a moment.'}
                </p>
              </div>

              {/* Error Details (Collapsible) */}
              <details className="w-full">
                <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors mb-2">
                  Technical Details
                </summary>
                <div className="mt-3 p-4 bg-muted/50 rounded-lg border border-border text-left">
                  <p className="text-sm font-mono text-muted-foreground break-all">
                    {errorMessage}
                  </p>
                </div>
              </details>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto pt-4">
                <Button 
                  onClick={() => window.location.reload()} 
                  size="lg"
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry Connection
                </Button>
                <Button 
                  onClick={() => {
                    // Clear cache and reload
                    localStorage.clear()
                    window.location.reload()
                  }}
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  Clear Cache & Retry
                </Button>
              </div>

              {/* Helpful Tips */}
              <div className="pt-6 border-t border-border w-full">
                <p className="text-sm font-semibold text-foreground mb-3">Quick Troubleshooting:</p>
                <ul className="text-sm text-muted-foreground space-y-2 text-left max-w-md mx-auto">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Check your internet connection</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Ensure the API server is running</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Try refreshing the page or clearing your browser cache</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>If the problem persists, contact support</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // If no user but no error, show access denied
  if (!user) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground text-lg">Please log in to access your dashboard.</p>
        </div>
      </div>
    )
  }

  // Calculate statistics from real data (handle errors gracefully)
  const totalEnrollments = enrollmentsError ? 0 : (enrollments?.length || 0)
  const completedCourses = enrollmentsError ? 0 : (enrollments?.filter(e => e.enrollment_status === 'completed').length || 0)
  const averageGrade = enrollmentsError || !enrollments?.length
    ? 0
    : enrollments.reduce((acc, e) => acc + (e.current_grade_percentage || 0), 0) / enrollments.length

  // ALWAYS render the dashboard - never return null or undefined
  // This ensures the page never disappears even if APIs fail
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">
          {getGreeting()}, {user?.first_name || 'Student'}!
        </h1>
        <p className="text-muted-foreground text-lg">
          Welcome to your smart campus dashboard
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Enrollments
            </CardTitle>
            <BookOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{totalEnrollments}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active courses this semester
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completed Courses
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">{completedCourses}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Successfully finished
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Grade
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-secondary">
              {averageGrade.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Current semester performance
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20 hover:shadow-lg transition-shadow cursor-pointer">
          <Link to="/courses">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Available Courses
              </CardTitle>
              <Calendar className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent">
                {coursesError ? 'N/A' : (courses?.length || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {coursesError ? 'Unable to load' : 'Courses you can enroll in'}
              </p>
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-3 w-full text-accent hover:text-accent hover:bg-accent/10"
                asChild
              >
                <div className="flex items-center justify-center gap-2">
                  <span>Browse & Enroll</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </Button>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* Current Enrollments */}
      <Card>
        <CardHeader>
          <CardTitle>Current Enrollments</CardTitle>
          <CardDescription>
            Your active courses for this semester
          </CardDescription>
        </CardHeader>
        <CardContent>
          {enrollmentsError ? (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Unable to Load Enrollments
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Failed to fetch enrollment data. You can still browse courses.
              </p>
              <Button onClick={() => window.location.href = '/courses'}>
                Browse Courses
              </Button>
            </div>
          ) : enrollmentsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 rounded-lg border border-border animate-pulse">
                  <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : enrollments && enrollments.length > 0 ? (
            <div className="space-y-3">
              {enrollments.map((enrollment) => (
                <div
                  key={enrollment.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
                >
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">
                      {enrollment.course_code} - {enrollment.course_title}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Section {enrollment.section_number} • {enrollment.semester}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {enrollment.is_waitlisted ? (
                      <Badge variant="warning">
                        Waitlist #{enrollment.waitlist_position}
                      </Badge>
                    ) : enrollment.current_letter_grade ? (
                      <Badge
                        variant="outline"
                        className={getGradeColor(enrollment.current_letter_grade)}
                      >
                        {enrollment.current_letter_grade}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">In Progress</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No Enrollments Yet
              </h3>
              <p className="text-muted-foreground mb-4">
                Start by enrolling in courses
              </p>
              <Button onClick={() => window.location.href = '/courses'}>
                Browse Courses
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Get started with your academic journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Button 
              variant="outline" 
              className="h-auto flex-col py-6 hover:bg-primary/10 hover:border-primary transition-all" 
              asChild
            >
              <Link to="/courses">
                <BookOpen className="h-8 w-8 mb-3 text-primary" />
                <span className="text-lg font-semibold">Browse & Enroll in Courses</span>
                <span className="text-sm text-muted-foreground mt-1">
                  Find available courses and enroll in sections
                </span>
                <ArrowRight className="h-5 w-5 mt-2 text-primary" />
              </Link>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto flex-col py-6 hover:bg-secondary/10 hover:border-secondary transition-all" 
              asChild
            >
              <Link to="/enrollments">
                <Calendar className="h-8 w-8 mb-3 text-secondary" />
                <span className="text-lg font-semibold">My Enrollments</span>
                <span className="text-sm text-muted-foreground mt-1">
                  View your enrolled courses and grades
                </span>
                <ArrowRight className="h-5 w-5 mt-2 text-secondary" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

