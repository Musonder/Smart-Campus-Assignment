/**
 * Authentication Service - Real API Integration
 * 
 * Connects to User Service for authentication
 */

import apiClient from '@/lib/api-client'

export interface RegisterRequest {
  email: string
  password: string
  first_name: string
  last_name: string
  middle_name?: string
  user_type: 'student' | 'lecturer' | 'staff' | 'admin'
  student_id?: string
  employee_id?: string
  department?: string
  major?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user_id: string
}

export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  user_type: string
  roles: string[]
  attached_roles: string[]
  is_active: boolean
  email_verified: boolean
  created_at: string
  last_login_at?: string
}

class AuthService {
  /**
   * Register a new user - REAL API CALL
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/api/v1/auth/register', data)
    
    // Store tokens
    localStorage.setItem('access_token', response.data.access_token)
    localStorage.setItem('refresh_token', response.data.refresh_token)
    localStorage.setItem('user_id', response.data.user_id)
    
    return response.data
  }

  /**
   * Login user - REAL API CALL
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/api/v1/auth/login', data)
    
    // Store tokens
    localStorage.setItem('access_token', response.data.access_token)
    localStorage.setItem('refresh_token', response.data.refresh_token)
    localStorage.setItem('user_id', response.data.user_id)
    
    return response.data
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    const token = localStorage.getItem('access_token')
    if (token) {
      try {
        await apiClient.post('/api/v1/auth/logout', { access_token: token })
      } catch (error) {
        console.error('Logout API call failed:', error)
      }
    }
    
    // Clear local storage
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_id')
  }

  /**
   * Get current user profile - REAL API CALL
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/api/v1/users/me')
    return response.data
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token')
  }

  /**
   * Get stored access token
   */
  getAccessToken(): string | null {
    return localStorage.getItem('access_token')
  }
}

export const authService = new AuthService()

