/**
 * Lecturer Reports Page
 * 
 * Generate and view teaching reports and analytics
 */

import { useQuery } from '@tanstack/react-query'
import { FileText, Download, BarChart3, TrendingUp, Users, BookOpen } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import apiClient from '@/lib/api-client'

export function LecturerReportsPage() {
  // Fetch lecturer's sections for reports
  const { data: sections, isLoading, isError, error } = useQuery({
    queryKey: ['lecturer-sections'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/api/v1/lecturer/sections')
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

  const totalStudents = sections?.reduce((sum: number, s: any) => sum + s.current_enrollment, 0) || 0
  const totalSections = sections?.length || 0
  const averageEnrollment = sections && sections.length > 0
    ? Math.round(sections.reduce((sum: number, s: any) => sum + s.current_enrollment, 0) / sections.length)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Teaching Reports</h1>
        <p className="text-muted-foreground mt-2">
          View analytics and generate reports for your courses
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sections</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSections}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active teaching sections
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {averageEnrollment} avg per section
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enrollment Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sections && sections.length > 0
                ? Math.round(
                    (sections.reduce((sum: number, s: any) => sum + s.current_enrollment, 0) /
                      sections.reduce((sum: number, s: any) => sum + s.max_enrollment, 0)) *
                      100
                  )
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Overall capacity utilization
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Report Generation */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Reports</CardTitle>
          <CardDescription>
            Create detailed reports for your courses and students
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Course Performance Report
                </CardTitle>
                <CardDescription>
                  Detailed analysis of student performance in your courses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Enrollment Report
                </CardTitle>
                <CardDescription>
                  Overview of enrollment statistics and trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Student Attendance Report
                </CardTitle>
                <CardDescription>
                  Attendance records and statistics for your sections
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Grade Distribution Report
                </CardTitle>
                <CardDescription>
                  Analysis of grade distribution and student outcomes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Section Details */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-4 text-muted-foreground">Loading sections...</p>
          </CardContent>
        </Card>
      ) : isError ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Unable to Load Data
            </h3>
            <p className="text-muted-foreground mb-4">
              {error?.message || 'Failed to fetch section data'}
            </p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      ) : sections && sections.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Section Details</CardTitle>
            <CardDescription>
              Detailed information about your teaching sections
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sections.map((section: any) => (
                <Card key={section.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
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
                        <h3 className="text-lg font-semibold text-foreground mb-1">
                          {section.course_title}
                        </h3>
                        <div className="grid grid-cols-3 gap-4 mt-4">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Enrollment</p>
                            <p className="text-sm font-semibold">
                              {section.current_enrollment} / {section.max_enrollment}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Capacity</p>
                            <p className="text-sm font-semibold">
                              {Math.round((section.current_enrollment / section.max_enrollment) * 100)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Semester</p>
                            <p className="text-sm font-semibold">{section.semester}</p>
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Sections Available
            </h3>
            <p className="text-muted-foreground">
              You don't have any sections assigned yet. Reports will be available once you have teaching assignments.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

