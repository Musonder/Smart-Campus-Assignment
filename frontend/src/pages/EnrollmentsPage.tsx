/**
 * Enrollments Page
 * 
 * View and manage course enrollments - REAL API data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GraduationCap, Calendar, Trash2, AlertCircle, BookOpen } from 'lucide-react'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { academicService } from '@/services/academic.service'
import { formatDate, getGradeColor, cn } from '@/lib/utils'
import { getErrorMessage } from '@/lib/api-client'

export function EnrollmentsPage() {
  const queryClient = useQueryClient()

  // Fetch enrollments - REAL API
  const { data: enrollments, isLoading, isError, error } = useQuery({
    queryKey: ['myEnrollments'],
    queryFn: () => academicService.getMyEnrollments(),
    retry: 2,
  })

  // Drop enrollment mutation - REAL API
  const dropMutation = useMutation({
    mutationFn: (enrollmentId: string) =>
      academicService.dropEnrollment(enrollmentId),
    onSuccess: () => {
      toast.success('Course dropped successfully')
      queryClient.invalidateQueries({ queryKey: ['myEnrollments'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })

  const handleDrop = (enrollmentId: string, courseName: string) => {
    if (confirm(`Are you sure you want to drop ${courseName}?`)) {
      dropMutation.mutate(enrollmentId)
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">
          My Enrollments
        </h1>
        <p className="text-muted-foreground text-lg">
          Manage your course enrollments and view grades
        </p>
      </div>

      {/* Enrollments List */}
      {isError ? (
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Unable to Load Enrollments
            </h3>
            <p className="text-muted-foreground mb-4">
              {error?.message || 'Failed to fetch enrollment data'}
            </p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-4 text-muted-foreground">Loading enrollments...</p>
          </CardContent>
        </Card>
      ) : enrollments && enrollments.length > 0 ? (
        <div className="space-y-4">
          {enrollments.map((enrollment) => (
            <Card
              key={enrollment.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-foreground">
                        {enrollment.course_code}
                      </h3>
                      <Badge variant="outline">
                        Section {enrollment.section_number}
                      </Badge>
                      {enrollment.is_waitlisted ? (
                        <Badge variant="warning">
                          Waitlist #{enrollment.waitlist_position}
                        </Badge>
                      ) : enrollment.enrollment_status === 'completed' ? (
                        <Badge variant="success">Completed</Badge>
                      ) : (
                        <Badge variant="secondary">Enrolled</Badge>
                      )}
                    </div>
                    <h4 className="text-lg text-muted-foreground">
                      {enrollment.course_title}
                    </h4>
                  </div>
                  
                  {!enrollment.is_waitlisted && enrollment.enrollment_status === 'enrolled' && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDrop(enrollment.id, enrollment.course_title)}
                      disabled={dropMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-3">
                  {/* Semester Info */}
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Semester
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {enrollment.semester}
                    </p>
                  </div>

                  {/* Enrolled Date */}
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      Enrolled
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatDate(enrollment.enrolled_at)}
                    </p>
                  </div>

                  {/* Current Grade */}
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      Current Grade
                    </p>
                    {enrollment.current_letter_grade ? (
                      <div className="flex items-center gap-2">
                        <p className={cn(
                          "text-2xl font-bold",
                          getGradeColor(enrollment.current_letter_grade)
                        )}>
                          {enrollment.current_letter_grade}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          ({enrollment.current_grade_percentage.toFixed(1)}%)
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Not graded yet
                      </p>
                    )}
                  </div>
                </div>

                {/* Waitlist Warning */}
                {enrollment.is_waitlisted && (
                  <div className="mt-4 p-3 rounded-lg bg-warning/10 border border-warning/20">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-warning">
                          You're on the waitlist
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          You'll be automatically enrolled when a seat becomes available.
                          Current position: #{enrollment.waitlist_position}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <GraduationCap className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No Enrollments Yet
            </h3>
            <p className="text-muted-foreground mb-6">
              You haven't enrolled in any courses for this semester
            </p>
            <Button onClick={() => window.location.href = '/courses'} size="lg">
              <BookOpen className="h-5 w-5 mr-2" />
              Browse Available Courses
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

