/**
 * Lecturer Dashboard
 * 
 * Comprehensive lecturer overview with teaching statistics, course management,
 * and quick access to all lecturer functions.
 */

import { useQuery } from '@tanstack/react-query'
import { 
  BookOpen, 
  Users, 
  ClipboardCheck, 
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  GraduationCap
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { authService } from '@/services/auth.service'
import apiClient from '@/lib/api-client'
import { getGreeting } from '@/lib/utils'

interface LecturerStats {
  total_sections: number
  total_students: number
  active_courses: number
  pending_grades: number
  average_enrollment: number
  upcoming_classes: number
}

interface Section {
  id: string
  course_code: string
  course_title: string
  section_number: string
  semester: string
  current_enrollment: number
  max_enrollment: number
  schedule_days: string[]
  start_time: string
  end_time: string
}

export function LecturerDashboardPage() {
  // Fetch current user - REAL API ONLY
  const { data: user, isLoading: userLoading, isError: userError } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => authService.getCurrentUser(),
    retry: 2,
  })

  // Fetch lecturer sections - REAL API
  const { data: sections, isLoading: sectionsLoading, isError: sectionsError } = useQuery({
    queryKey: ['lecturer-sections'],
    queryFn: async () => {
      try {
        const response = await apiClient.get<Section[]>('/api/v1/lecturer/sections')
        return response.data || []
      } catch (error: any) {
        const status = error?.response?.status || error?.status
        const code = error?.code || error?.response?.code
        
        if (status === 503 || status === 500 || code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'ENOTFOUND') {
          console.warn('Academic Service unavailable, returning empty sections', { status, code })
          return []
        }
        
        console.warn('Error fetching sections, returning empty array', error)
        return []
      }
    },
    retry: false,
    throwOnError: false,
  })

  // Calculate statistics from sections
  const stats: LecturerStats = {
    total_sections: sections?.length || 0,
    total_students: sections?.reduce((sum, s) => sum + s.current_enrollment, 0) || 0,
    active_courses: sections ? new Set(sections.map(s => s.course_code)).size : 0,
    pending_grades: 0, // TODO: Fetch from grading API
    average_enrollment: sections && sections.length > 0
      ? Math.round(sections.reduce((sum, s) => sum + s.current_enrollment, 0) / sections.length)
      : 0,
    upcoming_classes: 0, // TODO: Calculate from schedule
  }

  // Always render the dashboard, even if APIs fail
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">
          {userLoading ? (
            'Loading...'
          ) : userError ? (
            'Lecturer Dashboard'
          ) : (
            `${getGreeting()}, ${user?.first_name || 'Lecturer'}!`
          )}
        </h1>
        <p className="text-muted-foreground text-lg">
          Teaching Overview & Course Management
        </p>
        {userError && (
          <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              ⚠️ Unable to load user information. Dashboard features may be limited.
            </p>
          </div>
        )}
      </div>

      {/* Key Statistics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Sections</CardTitle>
            <BookOpen className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.total_sections}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.active_courses} active courses
            </p>
            <Button variant="ghost" size="sm" className="mt-2" asChild>
              <Link to="/lecturer/courses">View Courses →</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{stats.total_students}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.average_enrollment} avg per section
            </p>
            <Button variant="ghost" size="sm" className="mt-2" asChild>
              <Link to="/lecturer/students">View Students →</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Grades</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.pending_grades}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Assessments to grade
            </p>
            <Button variant="ghost" size="sm" className="mt-2" asChild>
              <Link to="/lecturer/grading">Grade Now →</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Classes</CardTitle>
            <Calendar className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{stats.upcoming_classes}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Classes this week
            </p>
            <Button variant="ghost" size="sm" className="mt-2" asChild>
              <Link to="/lecturer/schedule">View Schedule →</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* My Sections Overview */}
      {sectionsLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-4 text-muted-foreground">Loading your sections...</p>
          </CardContent>
        </Card>
      ) : sectionsError ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Unable to Load Sections
            </h3>
            <p className="text-muted-foreground mb-4">
              Failed to fetch your teaching sections from the API
            </p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      ) : sections && sections.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>My Teaching Sections</CardTitle>
            <CardDescription>
              Overview of all sections you're teaching this semester
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sections.map((section) => (
                <Card key={section.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="font-mono">
                            {section.course_code}
                          </Badge>
                          <Badge variant="secondary">
                            Section {section.section_number}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg mb-1 line-clamp-2">
                          {section.course_title}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {section.semester}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Enrollment</span>
                      <span className="font-semibold">
                        {section.current_enrollment} / {section.max_enrollment}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>
                        {section.schedule_days.join(', ')} • {section.start_time} - {section.end_time}
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            (section.current_enrollment / section.max_enrollment) * 100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <Link to={`/lecturer/courses`}>View Details</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No Sections Assigned
            </h3>
            <p className="text-muted-foreground mb-4">
              You don't have any teaching sections assigned yet. Contact your administrator to get assigned to courses.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common teaching tasks and functions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-auto flex-col py-6" asChild>
              <Link to="/lecturer/courses">
                <BookOpen className="h-6 w-6 mb-2" />
                <span>My Courses</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-6" asChild>
              <Link to="/lecturer/students">
                <Users className="h-6 w-6 mb-2" />
                <span>My Students</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-6" asChild>
              <Link to="/lecturer/grading">
                <ClipboardCheck className="h-6 w-6 mb-2" />
                <span>Grading</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-6" asChild>
              <Link to="/lecturer/schedule">
                <Calendar className="h-6 w-6 mb-2" />
                <span>Schedule</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

