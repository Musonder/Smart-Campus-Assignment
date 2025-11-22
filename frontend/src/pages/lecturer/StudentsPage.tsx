/**
 * Lecturer Students Page
 * 
 * View and manage students enrolled in lecturer's sections
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users, Search, Mail, GraduationCap, BookOpen } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import apiClient from '@/lib/api-client'
import { Link } from 'react-router-dom'

interface Enrollment {
  id: string
  student_id: string
  student_name: string
  student_email: string
  course_code: string
  course_title: string
  section_number: string
  semester: string
  enrollment_status: string
  enrolled_at: string
  current_grade_percentage?: number
  current_letter_grade?: string
  attendance_percentage: number
}

export function LecturerStudentsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSection, setSelectedSection] = useState<string>('all')

  // Fetch lecturer's sections
  const { data: sections } = useQuery({
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

  // Fetch enrollments (students) for lecturer's sections via lecturer API
  const { data: enrollments, isLoading, isError, error } = useQuery<Enrollment[]>({
    queryKey: ['lecturer-enrollments', selectedSection],
    queryFn: async () => {
      try {
        const params: any = {}
        if (selectedSection && selectedSection !== 'all') {
          params.section_id = selectedSection
        }

        const response = await apiClient.get('/api/v1/lecturer/students', { params })
        return response.data || []
      } catch (error: any) {
        const status = error?.response?.status || error?.status
        const code = error?.code || error?.response?.code

        if (status === 401 || status === 403) {
          console.warn('Lecturer not authorized to view students or not logged in', { status })
          return []
        }

        if (status === 503 || status === 500 || code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'ENOTFOUND') {
          console.warn('Academic Service unavailable, returning empty enrollments', { status, code })
          return []
        }

        console.warn('Error fetching enrollments, returning empty array', error)
        return []
      }
    },
    retry: false,
    throwOnError: false,
    enabled: !!sections, // Only fetch if sections are loaded
  })

  // Filter enrollments by search term
  const filteredEnrollments = enrollments?.filter((enrollment) => {
    const matchesSearch = searchTerm === '' ||
      enrollment.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.student_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.course_code.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesSearch
  }) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Students</h1>
        <p className="text-muted-foreground mt-2">
          View and manage students enrolled in your sections
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Filter by Section</label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="all">All Sections</option>
                {sections?.map((section: any) => (
                  <option key={section.id} value={section.id}>
                    {section.course_code} - Section {section.section_number}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Search Students</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or course..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students List */}
      <Card>
        <CardHeader>
          <CardTitle>Enrolled Students</CardTitle>
          <CardDescription>
            {filteredEnrollments.length} student{filteredEnrollments.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-10 text-muted-foreground">
              Loading students...
            </div>
          ) : isError ? (
            <div className="text-center py-10">
              <Users className="h-16 w-16 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Unable to Load Students
              </h3>
              <p className="text-muted-foreground mb-4">
                {error?.message || 'Failed to fetch student data'}
              </p>
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
          ) : filteredEnrollments.length > 0 ? (
            <div className="space-y-4">
              {filteredEnrollments.map((enrollment) => (
                <Card key={enrollment.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
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
                          <Badge variant={enrollment.enrollment_status === 'enrolled' ? 'default' : 'secondary'}>
                            {enrollment.enrollment_status}
                          </Badge>
                        </div>
                        <div className="space-y-1 mb-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            <span>{enrollment.student_email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <BookOpen className="h-4 w-4" />
                            <span>{enrollment.course_title}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <GraduationCap className="h-4 w-4" />
                            <span>Enrolled: {new Date(enrollment.enrolled_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-4">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Attendance</p>
                            <p className="text-sm font-semibold">{enrollment.attendance_percentage.toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Current Grade</p>
                            <p className="text-sm font-semibold">
                              {enrollment.current_letter_grade || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Percentage</p>
                            <p className="text-sm font-semibold">
                              {enrollment.current_grade_percentage?.toFixed(1) || 'N/A'}%
                            </p>
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/lecturer/grading?student_id=${enrollment.student_id}&section_id=${enrollment.id}`}>
                          View Grades
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No Students Found
              </h3>
              <p className="text-muted-foreground">
                {searchTerm
                  ? 'Try adjusting your search criteria'
                  : 'No students enrolled in your sections yet'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

