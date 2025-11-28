/**
 * Minimal TypeScript client SDK for Argos APIs.
 *
 * Demonstrates cross-language interoperability by allowing a Node/TS application
 * to authenticate and perform core flows (login, list courses, enroll).
 *
 * Usage:
 *   import { ArgosClient } from './argos-client'
 *
 *   const client = new ArgosClient('http://localhost:8000')
 *   await client.login('student@university.edu', 'Student123!')
 *   const courses = await client.listCourses()
 *   ...
 */

import axios, { AxiosInstance } from 'axios'

export class ArgosClient {
  private api: AxiosInstance
  private accessToken: string | null = null

  constructor(baseUrl: string) {
    this.api = axios.create({
      baseURL: baseUrl,
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  async login(email: string, password: string): Promise<void> {
    const resp = await this.api.post('/api/v1/auth/login', { email, password })
    this.accessToken = resp.data.access_token
  }

  private authHeaders() {
    return this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {}
  }

  async getCurrentUser(): Promise<any> {
    const resp = await this.api.get('/api/v1/users/me', { headers: this.authHeaders() })
    return resp.data
  }

  async listCourses(): Promise<any[]> {
    const resp = await this.api.get('/api/v1/academic/courses', { headers: this.authHeaders() })
    return resp.data || []
  }

  async enroll(studentId: string, sectionId: string): Promise<any> {
    const resp = await this.api.post(
      '/api/v1/academic/enrollments',
      { student_id: studentId, section_id: sectionId },
      { headers: this.authHeaders() },
    )
    return resp.data
  }
}


