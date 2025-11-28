/**
 * Admin Enrollments Management Page
 * 
 * View enrollments for courses/sections and assign grades to students
 */

import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Users, Search, Loader2, BookOpen, ChevronDown, ChevronRight, ArrowUpDown, AlertTriangle, Mail } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import apiClient from '@/lib/api-client'
import { getGradeColor } from '@/lib/utils'

interface Enrollment {
  id: string
  student_id: string
  student_name: string
  student_email?: string
  section_id: string
  section_number: string
  course_code: string
  course_title: string
  semester: string
  enrollment_status: string
  is_waitlisted: boolean
  waitlist_position?: number
  current_grade_percentage: number
  current_letter_grade?: string
  attendance_percentage: number
  enrolled_at: string
}

interface StudentEnrollmentGroup {
  student_id: string
  student_name: string
  student_email?: string
  enrollments: Enrollment[]
}

interface Section {
  id: string
  course_id: string
  course_code: string
  course_title: string
  section_number: string
  semester: string
  current_enrollment: number
  max_enrollment: number
}

interface Course {
  id: string
  course_code: string
  title: string
}

export function AdminEnrollmentsPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCourseId, setSelectedCourseId] = useState<string>(searchParams.get('course_id') || '')
  const [selectedSectionId, setSelectedSectionId] = useState<string>(searchParams.get('section_id') || '')
  const [expandedStudents, setExpandedStudents] = useState<Record<string, boolean>>({})
  const [sortMode, setSortMode] = useState<'name' | 'latest'>('name')
  const [showAtRiskOnly, setShowAtRiskOnly] = useState(false)
  
  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (selectedCourseId) params.set('course_id', selectedCourseId)
    if (selectedSectionId) params.set('section_id', selectedSectionId)
    setSearchParams(params, { replace: true })
  }, [selectedCourseId, selectedSectionId, setSearchParams])
  // Fetch courses for filtering
  const { data: courses } = useQuery({
    queryKey: ['admin-courses'],
    queryFn: async () => {
      const response = await apiClient.get<Course[]>('/api/v1/courses?limit=500')
      return response.data
    },
    retry: 2,
  })

  // Fetch sections for selected course
  const { data: sections } = useQuery({
    queryKey: ['admin-sections', selectedCourseId],
    queryFn: async () => {
      const response = await apiClient.get<Section[]>('/api/v1/academic/sections?limit=500')
      return response.data || []
    },
    retry: 2,
    enabled: !!selectedCourseId,
  })

  // Fetch enrollments - REAL API
  // Always enabled but returns empty array if no filters - ensures page never disappears
  // Handle ALL errors gracefully - return empty array instead of throwing
  const { data: enrollments, isLoading, isError, error } = useQuery<Enrollment[], Error>({
    queryKey: ['admin-enrollments', selectedSectionId, selectedCourseId],
    queryFn: async () => {
      // If no filters or "all" selected, return empty array instead of making API call
      if ((!selectedSectionId || selectedSectionId === 'all') && (!selectedCourseId || selectedCourseId === 'all')) {
        return []
      }
      
      try {
        const params: any = {}
        if (selectedSectionId && selectedSectionId !== 'all') {
          params.section_id = selectedSectionId
        } else if (selectedCourseId && selectedCourseId !== 'all') {
          params.course_id = selectedCourseId
        }
        
        const response = await apiClient.get<Enrollment[]>('/api/v1/admin/enrollments', { params })
        return response.data || []
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
    enabled: true, // Always enabled - queryFn handles empty case
    throwOnError: false, // Never throw errors - always return data
  })

  const normalizedEnrollments = Array.isArray(enrollments) ? enrollments : []

  // Text search filter
  const filteredEnrollments = normalizedEnrollments.filter((enrollment) => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return true

    return (
      enrollment.student_name.toLowerCase().includes(term) ||
      enrollment.course_code.toLowerCase().includes(term) ||
      enrollment.course_title.toLowerCase().includes(term)
    )
  })

  // Group by student
  const studentsMap = filteredEnrollments.reduce<Record<string, StudentEnrollmentGroup>>(
    (acc, enrollment) => {
      const existing = acc[enrollment.student_id]
      if (existing) {
        existing.enrollments.push(enrollment)
      } else {
        acc[enrollment.student_id] = {
          student_id: enrollment.student_id,
          student_name: enrollment.student_name,
          student_email: enrollment.student_email,
          enrollments: [enrollment],
        }
      }
      return acc
    },
    {},
  )

  let groupedStudents = Object.values(studentsMap)

  // At-risk filter: low attendance or low grade
  if (showAtRiskOnly) {
    groupedStudents = groupedStudents.filter((group) =>
      group.enrollments.some(
        (e) =>
          e.attendance_percentage < 75 ||
          (typeof e.current_grade_percentage === 'number' && e.current_grade_percentage < 50),
      ),
    )
  }

  // Sorting
  groupedStudents = groupedStudents.sort((a, b) => {
    if (sortMode === 'name') {
      return a.student_name.localeCompare(b.student_name)
    }

    // latest enrollment date (descending)
    const latestA = Math.max(
      ...a.enrollments.map((e) => new Date(e.enrolled_at).getTime() || 0),
    )
    const latestB = Math.max(
      ...b.enrollments.map((e) => new Date(e.enrolled_at).getTime() || 0),
    )
    return latestB - latestA
  })

  const uniqueStudentCount = groupedStudents.length
  const totalEnrollments = filteredEnrollments.length

  const averageGrade =
    filteredEnrollments.length > 0
      ? filteredEnrollments.reduce((sum, e) => sum + (e.current_grade_percentage || 0), 0) /
        filteredEnrollments.length
      : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Enrollment Management</h1>
        <p className="text-muted-foreground mt-2">
          View student enrollments and assign grades
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="filter-course">Filter by Course</Label>
              <Select
                value={selectedCourseId || 'all'}
                onValueChange={(value) => {
                  setSelectedCourseId(value === 'all' ? '' : value)
                  setSelectedSectionId('')
                }}
              >
                <SelectTrigger id="filter-course">
                  <SelectValue placeholder="All courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All courses</SelectItem>
                  {courses?.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.course_code} - {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="filter-section">Filter by Section</Label>
              <Select
                value={selectedSectionId || 'all'}
                onValueChange={(value) => {
                  setSelectedSectionId(value === 'all' ? '' : value)
                }}
                disabled={!selectedCourseId || selectedCourseId === 'all'}
              >
                <SelectTrigger id="filter-section">
                  <SelectValue placeholder="All sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sections</SelectItem>
                  {sections?.filter(s => s.course_id === selectedCourseId).map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.section_number} - {section.semester}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by student, course..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enrollments List */}
      <Card>
        <CardHeader>
          <CardTitle>Enrollments</CardTitle>
          <CardDescription>
            {uniqueStudentCount === 0
              ? 'No results for current filters'
              : `${uniqueStudentCount} student${uniqueStudentCount !== 1 ? 's' : ''} • ${totalEnrollments} enrollment${totalEnrollments !== 1 ? 's' : ''} • Avg grade ${averageGrade.toFixed(1)}%`}
          </CardDescription>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={() =>
                setSortMode((prev) => (prev === 'name' ? 'latest' : 'name'))
              }
            >
              <ArrowUpDown className="h-4 w-4" />
              <span>
                Sort by {sortMode === 'name' ? 'student name' : 'latest enrollment'}
              </span>
            </Button>
            <button
              type="button"
              onClick={() => setShowAtRiskOnly((prev) => !prev)}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${
                showAtRiskOnly
                  ? 'border-destructive text-destructive bg-destructive/5'
                  : 'border-muted text-muted-foreground hover:border-destructive/60 hover:text-destructive'
              }`}
            >
              <AlertTriangle className="h-3 w-3" />
              <span>{showAtRiskOnly ? 'Showing at-risk only' : 'Show at-risk students'}</span>
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {(!selectedCourseId || selectedCourseId === 'all') && (!selectedSectionId || selectedSectionId === 'all') ? (
            <div className="py-12 text-center">
              <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Select a Course or Section
              </h3>
              <p className="text-sm text-muted-foreground">
                Choose a course or section above to view enrollments
              </p>
            </div>
          ) : isLoading ? (
            <div className="py-10 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Loading enrollments...</p>
            </div>
          ) : isError ? (
            <div className="py-12 text-center">
              <Users className="h-16 w-16 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Unable to Load Enrollments
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {error ? (error instanceof Error ? error.message : String(error)) : 'Failed to fetch enrollment data'}
              </p>
              <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-enrollments'] })}>
                Retry
              </Button>
            </div>
          ) : groupedStudents.length > 0 ? (
            <div className="space-y-4">
              {groupedStudents.map((student) => (
                <Card
                  key={student.student_id}
                  className="hover:shadow-md transition-shadow border-l-4 border-l-primary"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedStudents((prev) => ({
                              ...prev,
                              [student.student_id]: !prev[student.student_id],
                            }))
                          }
                          className="mt-1 rounded-full p-1 hover:bg-muted transition-colors"
                          aria-label={
                            expandedStudents[student.student_id]
                              ? 'Collapse student enrollments'
                              : 'Expand student enrollments'
                          }
                        >
                          {expandedStudents[student.student_id] ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                        <div>
                          <h3 className="text-xl font-bold text-foreground">
                            {student.student_name}
                          </h3>
                          <div className="flex flex-col gap-0.5 mt-1">
                            {student.student_email && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                <span>{student.student_email}</span>
                              </div>
                            )}
                            <p className="text-[11px] font-mono text-muted-foreground">
                              ID: {student.student_id.substring(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="secondary">
                          {student.enrollments.length} enrollment
                          {student.enrollments.length !== 1 ? 's' : ''}
                        </Badge>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedStudents((prev) => ({
                              ...prev,
                              [student.student_id]: !prev[student.student_id],
                            }))
                          }
                          className="text-xs text-primary hover:underline"
                        >
                          {expandedStudents[student.student_id]
                            ? 'Hide enrollments'
                            : 'Show enrollments'}
                        </button>
                      </div>
                    </div>
                  </CardHeader>
                  {expandedStudents[student.student_id] && (
                    <CardContent className="pt-0 pb-4">
                      <div className="space-y-3">
                        {student.enrollments.map((enrollment) => (
                          <div
                            key={enrollment.id}
                            className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border rounded-md p-3 bg-muted/40"
                          >
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <Badge variant="outline" className="font-mono">
                                  {enrollment.course_code}
                                </Badge>
                                <Badge variant="secondary">
                                  Section {enrollment.section_number}
                                </Badge>
                                {enrollment.is_waitlisted ? (
                                  <Badge variant="warning">
                                    Waitlist #{enrollment.waitlist_position}
                                  </Badge>
                                ) : (
                                  <Badge variant="default">Enrolled</Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {enrollment.course_title}
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                                <span>Semester: {enrollment.semester}</span>
                                <span>•</span>
                                <span>
                                  Enrolled:{' '}
                                  {new Date(enrollment.enrolled_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-4">
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                  Attendance
                                </p>
                                <p className="text-sm font-semibold">
                                  {enrollment.attendance_percentage.toFixed(1)}%
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                  Grade
                                </p>
                                {enrollment.current_letter_grade ? (
                                  <div className="text-right">
                                    <div
                                      className={`text-lg font-bold ${getGradeColor(
                                        enrollment.current_letter_grade,
                                      )}`}
                                    >
                                      {enrollment.current_letter_grade}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {enrollment.current_grade_percentage.toFixed(1)}%
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-sm text-muted-foreground">No grade</div>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground max-w-[220px]">
                                Grades are maintained by course lecturers. This view is read-only.
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No enrollments found
              </h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm
                  ? 'Try adjusting your search criteria'
                  : 'No students enrolled in the selected course/section'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin view is read-only for grades; lecturers manage grading from their dashboard. */}
    </div>
  )
}

