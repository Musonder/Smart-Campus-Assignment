/**
 * Argos Smart Campus TypeScript/JavaScript Client SDK
 * 
 * Provides a minimal client SDK for interacting with the Smart Campus API.
 * Supports authentication and complex flows.
 */

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user_id: string;
  expires_in: number;
}

export interface EnrollmentRequest {
  student_id: string;
  section_id: string;
}

export interface EnrollmentResponse {
  id: string;
  student_id: string;
  section_id: string;
  enrollment_status: string;
  is_waitlisted: boolean;
  waitlist_position?: number;
  enrolled_at: string;
}

export interface Course {
  id: string;
  course_code: string;
  title: string;
  description: string;
  credits: number;
  level: string;
  department: string;
  prerequisites: string[];
}

export interface Section {
  id: string;
  course_id: string;
  section_number: string;
  semester: string;
  instructor_id: string;
  schedule_days: string[];
  start_time: string;
  end_time: string;
  max_enrollment: number;
  current_enrollment: number;
  is_full: boolean;
}

export class ArgosClient {
  private baseUrl: string;
  private apiVersion: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(baseUrl: string = "http://localhost:8000", apiVersion: string = "v1") {
    this.baseUrl = baseUrl;
    this.apiVersion = apiVersion;
  }

  /**
   * Authenticate and obtain access token.
   */
  async authenticate(credentials: AuthCredentials): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/api/${this.apiVersion}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
      }),
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.statusText}`);
    }

    const data: AuthResponse = await response.json();
    this.accessToken = data.access_token;
    this.refresh_token = data.refresh_token;
    return data;
  }

  /**
   * Get authenticated request headers.
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "Accept": `application/vnd.argos.${this.apiVersion}+json`,
    };

    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    return headers;
  }

  /**
   * Make authenticated API request.
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/api/${this.apiVersion}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    if (response.status === 401 && this.refreshToken) {
      // Try to refresh token
      await this.refreshAccessToken();
      // Retry request
      return this.request<T>(endpoint, options);
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`API request failed: ${error.message || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Refresh access token.
   */
  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await fetch(`${this.baseUrl}/api/${this.apiVersion}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refresh_token: this.refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error("Token refresh failed");
    }

    const data: AuthResponse = await response.json();
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;
  }

  /**
   * Get all courses.
   */
  async getCourses(department?: string, level?: string): Promise<Course[]> {
    const params = new URLSearchParams();
    if (department) params.append("department", department);
    if (level) params.append("level", level);

    const query = params.toString();
    const endpoint = `/courses${query ? `?${query}` : ""}`;
    
    const response = await this.request<{ courses: Course[]; total: number }>(endpoint);
    return response.courses;
  }

  /**
   * Get course by ID.
   */
  async getCourse(courseId: string): Promise<Course> {
    return this.request<Course>(`/courses/${courseId}`);
  }

  /**
   * Get sections for a course.
   */
  async getSections(courseCode: string, semester?: string): Promise<Section[]> {
    const params = new URLSearchParams();
    params.append("course_code", courseCode);
    if (semester) params.append("semester", semester);

    const response = await this.request<{ sections: Section[] }>(
      `/sections?${params.toString()}`
    );
    return response.sections;
  }

  /**
   * Enroll student in a section (complex flow).
   * 
   * This demonstrates a complex flow:
   * 1. Check section availability
   * 2. Validate prerequisites
   * 3. Enroll student
   * 4. Handle waitlist if full
   */
  async enrollStudent(request: EnrollmentRequest): Promise<EnrollmentResponse> {
    // Step 1: Get section details
    const section = await this.request<Section>(`/sections/${request.section_id}`);
    
    if (section.is_full) {
      console.warn(`Section ${section.id} is full. Student will be added to waitlist.`);
    }

    // Step 2: Enroll (service handles prerequisites, capacity, etc.)
    const enrollment = await this.request<EnrollmentResponse>(
      `/enrollments`,
      {
        method: "POST",
        body: JSON.stringify({
          student_id: request.student_id,
          section_id: request.section_id,
        }),
      }
    );

    return enrollment;
  }

  /**
   * Get student enrollments.
   */
  async getEnrollments(studentId: string, semester?: string): Promise<EnrollmentResponse[]> {
    const params = new URLSearchParams();
    params.append("student_id", studentId);
    if (semester) params.append("semester", semester);

    const response = await this.request<{ enrollments: EnrollmentResponse[] }>(
      `/enrollments?${params.toString()}`
    );
    return response.enrollments;
  }

  /**
   * Drop enrollment.
   */
  async dropEnrollment(enrollmentId: string): Promise<void> {
    await this.request(`/enrollments/${enrollmentId}`, {
      method: "DELETE",
    });
  }

  /**
   * Set API version.
   */
  setApiVersion(version: string): void {
    this.apiVersion = version;
  }

  /**
   * Get current API version.
   */
  getApiVersion(): string {
    return this.apiVersion;
  }
}

// Export default instance factory
export function createClient(baseUrl?: string, apiVersion?: string): ArgosClient {
  return new ArgosClient(baseUrl, apiVersion);
}

