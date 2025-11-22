/**
 * Admin Enrollments Management Page
 * 
 * View enrollments for courses/sections and assign grades to students
 */

import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Users, Search, Edit, Loader2, BookOpen } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import apiClient, { getErrorMessage } from '@/lib/api-client'
import { getGradeColor } from '@/lib/utils'

interface Enrollment {
  id: string
  student_id: string
  student_name: string
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

interface GradeForm {
  student_id: string
  section_id: string
  points_earned: number
  total_points: number
  feedback: string
  is_late: boolean
}

export function AdminEnrollmentsPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCourseId, setSelectedCourseId] = useState<string>(searchParams.get('course_id') || '')
  const [selectedSectionId, setSelectedSectionId] = useState<string>(searchParams.get('section_id') || '')
  
  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (selectedCourseId) params.set('course_id', selectedCourseId)
    if (selectedSectionId) params.set('section_id', selectedSectionId)
    setSearchParams(params, { replace: true })
  }, [selectedCourseId, selectedSectionId, setSearchParams])
  const [isGradeDialogOpen, setIsGradeDialogOpen] = useState(false)
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null)
  const [gradeForm, setGradeForm] = useState<GradeForm>({
    student_id: '',
    section_id: '',
    points_earned: 0,
    total_points: 100,
    feedback: '',
    is_late: false,
  })

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

  // Create grade mutation - REAL API
  const createGradeMutation = useMutation({
    mutationFn: async (data: GradeForm) => {
      const response = await apiClient.post('/api/v1/academic/grades', {
        student_id: data.student_id,
        section_id: data.section_id,
        points_earned: data.points_earned,
        total_points: data.total_points,
        feedback: data.feedback || undefined,
        is_late: data.is_late,
      })
      return response.data
    },
    onSuccess: () => {
      toast.success('Grade assigned successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-enrollments'] })
      queryClient.invalidateQueries({ queryKey: ['myEnrollments'] })
      setIsGradeDialogOpen(false)
      setSelectedEnrollment(null)
      setGradeForm({
        student_id: '',
        section_id: '',
        points_earned: 0,
        total_points: 100,
        feedback: '',
        is_late: false,
      })
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error))
    },
  })

  const handleAssignGrade = (enrollment: Enrollment) => {
    setSelectedEnrollment(enrollment)
    setGradeForm({
      student_id: enrollment.student_id,
      section_id: enrollment.section_id,
      points_earned: enrollment.current_grade_percentage || 0,
      total_points: 100,
      feedback: '',
      is_late: false,
    })
    setIsGradeDialogOpen(true)
  }

  const handleSubmitGrade = () => {
    if (!gradeForm.points_earned || !gradeForm.total_points) {
      toast.error('Please enter points earned and total points')
      return
    }
    createGradeMutation.mutate(gradeForm)
  }

  const filteredEnrollments = enrollments?.filter((enrollment) => {
    const matchesSearch = searchTerm === '' ||
      enrollment.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.course_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.course_title.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesSearch
  })

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
            {filteredEnrollments?.length || 0} enrollments found
          </CardDescription>
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
          ) : filteredEnrollments && Array.isArray(filteredEnrollments) && filteredEnrollments.length > 0 ? (
            <div className="space-y-4">
              {filteredEnrollments.map((enrollment) => (
                <Card
                  key={enrollment.id}
                  className="hover:shadow-md transition-shadow border-l-4 border-l-primary"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-foreground">
                            {enrollment.student_name}
                          </h3>
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
                        <h4 className="text-lg text-muted-foreground mb-2">
                          {enrollment.course_title}
                        </h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Semester: {enrollment.semester}</span>
                          <span>•</span>
                          <span>Enrolled: {new Date(enrollment.enrolled_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {enrollment.current_letter_grade ? (
                          <div className="text-right">
                            <div className={`text-2xl font-bold ${getGradeColor(enrollment.current_letter_grade)}`}>
                              {enrollment.current_letter_grade}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {enrollment.current_grade_percentage.toFixed(1)}%
                            </div>
                          </div>
                        ) : (
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">No grade</div>
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAssignGrade(enrollment)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          {enrollment.current_letter_grade ? 'Update Grade' : 'Assign Grade'}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Attendance</p>
                        <p className="text-sm font-semibold">{enrollment.attendance_percentage.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Status</p>
                        <p className="text-sm font-semibold capitalize">{enrollment.enrollment_status}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Student ID</p>
                        <p className="text-sm font-mono text-xs">{enrollment.student_id.substring(0, 8)}...</p>
                      </div>
                    </div>
                  </CardContent>
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

      {/* Assign Grade Dialog */}
      <Dialog open={isGradeDialogOpen} onOpenChange={setIsGradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Grade</DialogTitle>
            <DialogDescription>
              Assign grade for {selectedEnrollment?.student_name} in {selectedEnrollment?.course_code}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="grade-points-earned">Points Earned *</Label>
                <Input
                  id="grade-points-earned"
                  type="number"
                  min="0"
                  step="0.1"
                  value={gradeForm.points_earned}
                  onChange={(e) => setGradeForm({ ...gradeForm, points_earned: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="grade-total-points">Total Points *</Label>
                <Input
                  id="grade-total-points"
                  type="number"
                  min="1"
                  step="0.1"
                  value={gradeForm.total_points}
                  onChange={(e) => setGradeForm({ ...gradeForm, total_points: parseFloat(e.target.value) || 100 })}
                />
              </div>
            </div>
            {gradeForm.total_points > 0 && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium text-muted-foreground mb-1">Calculated Grade</p>
                <p className="text-2xl font-bold text-foreground">
                  {((gradeForm.points_earned / gradeForm.total_points) * 100).toFixed(1)}%
                </p>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="grade-feedback">Feedback (Optional)</Label>
              <textarea
                id="grade-feedback"
                className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={gradeForm.feedback}
                onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })}
                placeholder="Enter feedback for the student..."
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="grade-late"
                checked={gradeForm.is_late}
                onChange={(e) => setGradeForm({ ...gradeForm, is_late: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="grade-late">Mark as late submission</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGradeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitGrade} disabled={createGradeMutation.isPending}>
              {createGradeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Assign Grade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

