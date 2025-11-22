/**
 * Lecturer Courses Page
 * 
 * Manage courses taught by the lecturer
 */

import { useQuery } from '@tanstack/react-query'
import { BookOpen, Users, Calendar, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import apiClient from '@/lib/api-client'

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

export function LecturerCoursesPage() {
  const { data: sections, isLoading, isError, error } = useQuery({
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

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Courses</h1>
          <p className="text-muted-foreground mt-2">Manage your courses and sections</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Unable to Load Courses
            </h3>
            <p className="text-muted-foreground mb-4">
              {error?.message || 'Failed to fetch course data'}
            </p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Courses</h1>
          <p className="text-muted-foreground mt-2">Loading your courses...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Courses</h1>
        <p className="text-muted-foreground mt-2">
          Manage your courses and sections
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sections</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sections?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sections?.reduce((sum, s) => sum + s.current_enrollment, 0) || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Enrollment</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sections && sections.length > 0
                ? Math.round(
                    sections.reduce((sum, s) => sum + s.current_enrollment, 0) / sections.length
                  )
                : 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Capacity</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sections && sections.length > 0
                ? Math.round(
                    (sections.reduce((sum, s) => sum + s.current_enrollment, 0) /
                      sections.reduce((sum, s) => sum + s.max_enrollment, 0)) *
                      100
                  )
                : 0}
              %
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Courses List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sections?.map((section) => (
          <Card key={section.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">
                    {section.course_code} - {section.section_number}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {section.course_title}
                  </CardDescription>
                </div>
                <Badge variant={section.current_enrollment >= section.max_enrollment ? "destructive" : "secondary"}>
                  {section.semester}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Enrollment</span>
                <span className="font-medium">
                  {section.current_enrollment} / {section.max_enrollment}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Schedule</span>
                <span className="font-medium text-right">
                  {section.schedule_days.join(', ')}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Time</span>
                <span className="font-medium">
                  {section.start_time} - {section.end_time}
                </span>
              </div>

              {/* Progress bar */}
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
            </CardContent>
          </Card>
        ))}
      </div>

      {sections && sections.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No courses assigned
            </h3>
            <p className="text-sm text-muted-foreground">
              You don't have any courses assigned this semester yet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

