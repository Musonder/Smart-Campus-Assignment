/**
 * Academic Service - Real API Integration
 * 
 * Connects to Academic Service for courses, sections, and enrollments
 */

import apiClient from '@/lib/api-client'

export interface Course {
  id: string
  course_code: string
  title: string
  description: string
  credits: number
  level: string
  department: string
  prerequisites: string[]
  corequisites: string[]
  learning_outcomes: string[]
  is_lab_required: boolean
  max_enrollment_default: number
  created_at: string
  status: string
}

export interface Section {
  id: string
  course_id: string
  course_code: string
  course_title: string
  section_number: string
  semester: string
  instructor_id: string
  instructor_name?: string
  schedule_days: string[]
  start_time: string
  end_time: string
  room_id?: string
  room_number?: string
  max_enrollment: number
  current_enrollment: number
  waitlist_size: number
  max_waitlist: number
  is_full: boolean
  has_waitlist_space: boolean
  start_date: string
  end_date: string
  add_drop_deadline: string
  withdrawal_deadline: string
  created_at: string
}

export interface Enrollment {
  id: string
  student_id: string
  section_id: string
  course_code: string
  course_title: string
  section_number: string
  semester: string
  enrollment_status: string
  is_waitlisted: boolean
  waitlist_position?: number
  current_grade_percentage: number
  current_letter_grade?: string
  enrolled_at: string
  
  // Schedule information from section
  schedule_days: string[]
  start_time: string
  end_time: string
  room_id?: string
  instructor_id: string
}

export interface CreateCourseRequest {
  course_code: string
  title: string
  description: string
  credits: number
  level: string
  department: string
  prerequisites?: string[]
  corequisites?: string[]
}

export interface CreateSectionRequest {
  course_id: string
  section_number: string
  semester: string
  instructor_id: string
  schedule_days: string[]
  start_time: string
  end_time: string
  room_id?: string
  max_enrollment: number
  max_waitlist: number
  start_date: string
  end_date: string
  add_drop_deadline: string
  withdrawal_deadline: string
}

export interface EnrollRequest {
  student_id: string
  section_id: string
}

class AcademicService {
  /**
   * List courses - REAL API CALL
   */
  async listCourses(params?: {
    department?: string
    level?: string
    semester?: string
    skip?: number
    limit?: number
  }): Promise<Course[]> {
    const response = await apiClient.get<Course[]>('/api/v1/academic/courses', {
      params,
    })
    return response.data
  }

  /**
   * Get course by ID - REAL API CALL
   */
  async getCourse(courseId: string): Promise<Course> {
    const response = await apiClient.get<Course>(`/api/v1/academic/courses/${courseId}`)
    return response.data
  }

  /**
   * Create course - REAL API CALL
   */
  async createCourse(data: CreateCourseRequest): Promise<Course> {
    const response = await apiClient.post<Course>('/api/v1/academic/courses', data)
    return response.data
  }

  /**
   * List sections - REAL API CALL
   */
  async listSections(params?: {
    course_code?: string
    semester?: string
    instructor_id?: string
    available_only?: boolean
  }): Promise<Section[]> {
    const response = await apiClient.get<Section[]>('/api/v1/academic/sections', {
      params,
    })
    return response.data
  }

  /**
   * Get section by ID - REAL API CALL
   */
  async getSection(sectionId: string): Promise<Section> {
    const response = await apiClient.get<Section>(`/api/v1/academic/sections/${sectionId}`)
    return response.data
  }

  /**
   * Create section - REAL API CALL
   */
  async createSection(data: CreateSectionRequest): Promise<Section> {
    const response = await apiClient.post<Section>('/api/v1/academic/sections', data)
    return response.data
  }

  /**
   * Enroll in section - REAL API CALL with policy validation
   */
  async enroll(data: EnrollRequest): Promise<Enrollment> {
    const response = await apiClient.post<Enrollment>('/api/v1/academic/enrollments', data)
    return response.data
  }

  /**
   * Get student enrollments - REAL API CALL
   */
  async getMyEnrollments(semester?: string): Promise<Enrollment[]> {
    const response = await apiClient.get<Enrollment[]>('/api/v1/academic/enrollments', {
      params: semester ? { semester } : undefined,
    })
    return response.data
  }

  /**
   * Drop enrollment - REAL API CALL
   */
  async dropEnrollment(enrollmentId: string): Promise<void> {
    await apiClient.delete(`/api/v1/academic/enrollments/${enrollmentId}`)
  }
}

export const academicService = new AcademicService()

