/**
 * Courses Page
 * 
 * Browse and enroll in courses - REAL API integration with policy validation
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Search, Filter, BookOpen, Clock, AlertCircle, Grid3x3, List, ChevronDown, ChevronUp } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { academicService, type Enrollment } from '@/services/academic.service'
import { authService } from '@/services/auth.service'
import { getErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'

export function CoursesPage() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDepartment] = useState<string>('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set())

  // Fetch current user
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => authService.getCurrentUser(),
  })

  const { data: courses, isLoading: coursesLoading, isError: coursesError } = useQuery({
    queryKey: ['courses', selectedDepartment],
    queryFn: async () => {
      try {
        const coursesData = await academicService.listCourses({
          limit: 500,
        })
  
        console.log('[CoursesPage] Fetched courses:', coursesData?.length || 0, 'courses')
        if (coursesData && coursesData.length > 0) {
          console.log('[CoursesPage] Sample course:', {
            id: coursesData[0].id,
            course_code: coursesData[0].course_code,
            title: coursesData[0].title
          })
        }
        return coursesData || []
      } catch (error: any) {
        const status = error?.response?.status || error?.status
        const code = error?.code || error?.response?.code
        
        if (status === 503 || status === 500 || code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'ENOTFOUND') {
          console.warn('Academic Service unavailable, returning empty courses', { status, code })
          return []
        }
        
        console.warn('Error fetching courses, returning empty array', error)
        return []
      }
    },
    retry: false, 
    throwOnError: false, 
  })

  const { data: sections, isLoading: sectionsLoading, isError: sectionsError } = useQuery({
    queryKey: ['sections', selectedDepartment],
    queryFn: async () => {
      try {
        const sectionsData = await academicService.listSections({
          available_only: false,
        })
        // Debug logging to help troubleshoot section matching
        console.log('[CoursesPage] Fetched sections:', sectionsData?.length || 0, 'sections')
        if (sectionsData && sectionsData.length > 0) {
          console.log('[CoursesPage] Sample section:', {
            id: sectionsData[0].id,
            course_id: sectionsData[0].course_id,
            course_code: sectionsData[0].course_code,
            section_number: sectionsData[0].section_number
          })
        }
        return sectionsData || []
      } catch (error: any) {
        // Handle ALL errors gracefully - return empty array to prevent page from disappearing
        const status = error?.response?.status || error?.status
        const code = error?.code || error?.response?.code
        
        if (status === 503 || status === 500 || code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'ENOTFOUND') {
          console.warn('Academic Service unavailable, returning empty sections', { status, code })
          return []
        }
        
        // For any other error, also return empty array to prevent page crash
        console.warn('Error fetching sections, returning empty array', error)
        return []
      }
    },
    retry: false, // Don't retry - fail fast and return empty array
    throwOnError: false, // Never throw errors - always return data
  })

  // Fetch current student's enrollments to show enrollment status per section
  const { data: enrollments } = useQuery<Enrollment[]>({
    queryKey: ['myEnrollments'],
    queryFn: async () => {
      try {
        // If user is not logged in, treat as no enrollments
        if (!user) return []
        return await academicService.getMyEnrollments()
      } catch (error: any) {
        const status = error?.response?.status || error?.status
        const code = error?.code || error?.response?.code

        if (status === 401) {
          // Unauthorized – not logged in or token expired; treat as no enrollments
          console.warn('[CoursesPage] getMyEnrollments unauthorized, treating as guest')
          return []
        }

        if (status === 503 || status === 500 || code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'ENOTFOUND') {
          console.warn('[CoursesPage] Enrollment service unavailable, returning empty enrollments', { status, code })
          return []
        }

        console.warn('[CoursesPage] Error fetching enrollments, returning empty array', error)
        return []
      }
    },
    enabled: !!user, // Only fetch enrollments when a user is logged in
    retry: false,
    throwOnError: false,
  })

  const isLoading = coursesLoading || sectionsLoading
  const isError = coursesError || sectionsError

  // Enroll mutation - REAL API with policy validation
  const enrollMutation = useMutation({
    mutationFn: (sectionId: string) =>
      academicService.enroll({
        student_id: user!.id,
        section_id: sectionId,
      }),
    onSuccess: (enrollment) => {
      if (enrollment.is_waitlisted) {
        toast.success(
          `Added to waitlist (Position #${enrollment.waitlist_position})`
        )
      } else {
        toast.success('Successfully enrolled in course!')
      }
      // Refresh enrollments
      queryClient.invalidateQueries({ queryKey: ['myEnrollments'] })
    },
    onError: (error: any) => {
      const errorData = error.response?.data
      if (errorData?.detail?.violated_rules) {
        toast.error(errorData.detail.reason)
      } else {
        toast.error(getErrorMessage(error))
      }
    },
  })

  // Group sections by course and filter
  // Show courses with their sections, or courses without sections
  const coursesWithSections = courses?.map((course) => {
    if (!course) return null
    
    // Match sections to course by course_id (UUID comparison)
    // Also try matching by course_code as fallback for robustness
    const courseSections = sections?.filter(s => {
      if (!s) return false
      
      // Convert both to strings for comparison (handles UUID vs string mismatches)
      const sectionCourseId = String(s.course_id || '').toLowerCase().trim()
      const courseId = String(course.id || '').toLowerCase().trim()
      const matchesById = sectionCourseId === courseId && sectionCourseId !== ''
      
      // Fallback: match by course_code (case-insensitive)
      const sectionCode = (s.course_code || '').toUpperCase().trim()
      const courseCode = (course.course_code || '').toUpperCase().trim()
      const matchesByCode = sectionCode !== '' && courseCode !== '' && sectionCode === courseCode
      
      return matchesById || matchesByCode
    }) || []
    
    return {
      course,
      sections: courseSections,
    }
  }).filter((item): item is { course: any; sections: any[] } => {
    // Filter out null items and by search term
    if (!item) return false
    if (searchTerm === '') return true
    const searchLower = searchTerm.toLowerCase()
    return (
      item.course.course_code.toLowerCase().includes(searchLower) ||
      item.course.title.toLowerCase().includes(searchLower) ||
      item.course.description.toLowerCase().includes(searchLower)
    )
  }) || []

  const handleEnroll = (sectionId: string) => {
    if (!user) {
      toast.error('Please log in to enroll in courses')
      return
    }
    enrollMutation.mutate(sectionId)
  }

  const toggleDescription = (courseId: string) => {
    setExpandedDescriptions(prev => {
      const next = new Set(prev)
      if (next.has(courseId)) {
        next.delete(courseId)
      } else {
        next.add(courseId)
      }
      return next
    })
  }

  const truncateDescription = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">
          Browse Courses
        </h1>
        <p className="text-muted-foreground text-lg">
          Find and enroll in courses for the upcoming semester
        </p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search courses by code or title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('grid')}
                title="Grid view"
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('list')}
                title="List view"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Course Sections Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading courses...</p>
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Unable to Load Courses
            </h3>
            <p className="text-muted-foreground mb-4">
              The Academic Service is currently unavailable. Please try again later.
            </p>
            <Button onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['courses'] })
              queryClient.invalidateQueries({ queryKey: ['sections'] })
            }}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : coursesWithSections && coursesWithSections.length > 0 ? (
        <div className={cn(
          viewMode === 'grid' 
            ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" 
            : "space-y-4"
        )}>
          {coursesWithSections.map(({ course, sections: courseSections }) => {
            const isDescriptionExpanded = expandedDescriptions.has(course.id)
            const description = course.description || ''
            const shouldTruncate = description.length > 150
            const displayDescription = shouldTruncate && !isDescriptionExpanded 
              ? truncateDescription(description) 
              : description

            return (
              <Card 
                key={course.id} 
                className={cn(
                  "hover:shadow-md transition-all duration-200 border-l-4",
                  viewMode === 'grid' ? "border-l-primary" : "border-l-primary/50"
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge variant="outline" className="font-mono text-xs">
                          {course.course_code}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {course.credits} credits
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {course.department}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg mb-2 line-clamp-2">
                        {course.title}
                      </CardTitle>
                      {description && (
                        <div className="space-y-1">
                          <CardDescription className="text-sm leading-relaxed">
                            {displayDescription}
                          </CardDescription>
                          {shouldTruncate && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0 text-xs text-primary hover:text-primary/80"
                              onClick={() => toggleDescription(course.id)}
                            >
                              {isDescriptionExpanded ? (
                                <>
                                  <ChevronUp className="h-3 w-3 mr-1" />
                                  Read less
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3 w-3 mr-1" />
                                  Read more
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {course.prerequisites && course.prerequisites.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">Prerequisites:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {course.prerequisites.map((prereq: string, idx: number) => (
                          <Badge key={idx} variant="secondary" className="text-xs px-2 py-0.5 font-mono">
                            {prereq}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {courseSections.length > 0 ? (
                    <div className="space-y-2 pt-2 border-t">
                      <p className="text-xs font-semibold text-foreground mb-2">
                        Available Sections ({courseSections.length})
                      </p>
                      {courseSections.map((section) => {
                        const enrollmentForSection = enrollments?.find(
                          (e) => e.section_id === section.id
                        )

                        const isEnrolled =
                          enrollmentForSection &&
                          !enrollmentForSection.is_waitlisted &&
                          (enrollmentForSection.enrollment_status === 'enrolled' ||
                            enrollmentForSection.enrollment_status === 'completed')

                        const isWaitlisted = !!enrollmentForSection?.is_waitlisted

                        const buttonDisabled =
                          !user ||
                          enrollMutation.isPending ||
                          (section.is_full && !section.has_waitlist_space) ||
                          isEnrolled ||
                          isWaitlisted

                        let buttonLabel: React.ReactNode = 'Enroll Now'
                        if (enrollMutation.isPending) {
                          buttonLabel = <>Processing...</>
                        } else if (isEnrolled) {
                          buttonLabel =
                            enrollmentForSection?.enrollment_status === 'completed'
                              ? <>Completed</>
                              : <>Enrolled</>
                        } else if (isWaitlisted) {
                          buttonLabel = (
                            <>
                              Waitlisted
                              {typeof enrollmentForSection?.waitlist_position === 'number'
                                ? ` #${enrollmentForSection.waitlist_position}`
                                : ''}
                            </>
                          )
                        } else if (section.is_full) {
                          buttonLabel = section.has_waitlist_space ? <>Join Waitlist</> : <>Section Full</>
                        }

                        return (
                          <div
                            key={section.id}
                            className="p-3 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/30 transition-all"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs font-semibold">
                                  {section.section_number}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{section.semester}</span>
                                {isEnrolled && (
                                  <Badge variant="secondary" className="text-xs">
                                    {enrollmentForSection?.enrollment_status === 'completed'
                                      ? 'Completed'
                                      : 'Enrolled'}
                                  </Badge>
                                )}
                                {isWaitlisted && (
                                  <Badge variant="secondary" className="text-xs">
                                    Waitlisted
                                    {typeof enrollmentForSection?.waitlist_position === 'number'
                                      ? ` #${enrollmentForSection.waitlist_position}`
                                      : ''}
                                  </Badge>
                                )}
                              </div>
                              {section.is_full ? (
                                <Badge variant="destructive" className="text-xs">Full</Badge>
                              ) : (
                                <Badge variant="default" className="text-xs bg-green-600 hover:bg-green-700">
                                  {section.max_enrollment - section.current_enrollment} seats
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                              <Clock className="h-3 w-3" />
                              <span>{section.schedule_days.join(', ')} • {section.start_time} - {section.end_time}</span>
                            </div>
                            {section.is_full && section.has_waitlist_space && (
                              <div className="text-xs text-muted-foreground mb-2">
                                Waitlist: {section.waitlist_size} / {section.max_waitlist}
                              </div>
                            )}
                            <Button
                              size="sm"
                              className="w-full font-semibold"
                              onClick={() => handleEnroll(section.id)}
                              disabled={buttonDisabled}
                            >
                              {buttonLabel}
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="pt-2 border-t">
                      <div className="text-center py-4 space-y-1">
                        <AlertCircle className="h-6 w-6 text-muted-foreground mx-auto" />
                        <p className="text-xs font-medium text-foreground">
                          No sections available
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Sections will appear here when added
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Courses Found
            </h3>
            <p className="text-muted-foreground">
              {searchTerm
                ? 'Try adjusting your search criteria'
                : 'No courses available at this time'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

