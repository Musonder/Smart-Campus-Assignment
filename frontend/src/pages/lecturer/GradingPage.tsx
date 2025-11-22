/**
 * Lecturer Grading Page
 * 
 * Grade student assessments and assignments
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ClipboardCheck, Search, Filter } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import apiClient from '@/lib/api-client'

interface Assessment {
  id: string
  title: string
  course_code: string
  section_id: string
  type: string
  due_date: string
  total_points: number
  submissions_count: number
  graded_count: number
}

export function LecturerGradingPage() {
  const [searchTerm, setSearchTerm] = useState('')

  const { data: assessments, isLoading, isError, error } = useQuery({
    queryKey: ['lecturer-assessments'],
    queryFn: async () => {
      try {
        const response = await apiClient.get<Assessment[]>('/api/v1/lecturer/assessments')
        return response.data || []
      } catch (error: any) {
        const status = error?.response?.status || error?.status
        const code = error?.code || error?.response?.code
        
        if (status === 503 || status === 500 || code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'ENOTFOUND') {
          console.warn('Academic Service unavailable, returning empty assessments', { status, code })
          return []
        }
        
        console.warn('Error fetching assessments, returning empty array', error)
        return []
      }
    },
    retry: false,
    throwOnError: false,
  })

  const filteredAssessments = assessments?.filter((assessment) =>
    assessment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assessment.course_code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Grading</h1>
        <p className="text-muted-foreground mt-2">
          Review and grade student submissions
        </p>
      </div>

      {/* Search and filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assessments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Assessments List */}
      <div className="grid gap-4">
        {isError && (
          <Card>
            <CardContent className="py-12 text-center">
              <ClipboardCheck className="h-16 w-16 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Unable to Load Assessments
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {error?.message || 'Failed to fetch assessment data'}
              </p>
              <Button onClick={() => window.location.reload()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground">Loading assessments...</p>
            </CardContent>
          </Card>
        )}

        {filteredAssessments?.map((assessment) => (
          <Card key={assessment.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{assessment.title}</CardTitle>
                  <CardDescription className="mt-1">
                    {assessment.course_code} • Due: {new Date(assessment.due_date).toLocaleDateString()}
                  </CardDescription>
                </div>
                <Badge>{assessment.type}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-2 text-sm flex-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Points</span>
                    <span className="font-medium">{assessment.total_points}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Submissions</span>
                    <span className="font-medium">{assessment.submissions_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Graded</span>
                    <span className="font-medium">
                      {assessment.graded_count} / {assessment.submissions_count}
                    </span>
                  </div>
                </div>

                <div className="ml-6">
                  <Button size="sm">
                    Grade Submissions
                  </Button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-secondary rounded-full h-2 mt-4">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{
                    width: `${assessment.submissions_count > 0
                      ? (assessment.graded_count / assessment.submissions_count) * 100
                      : 0}%`,
                  }}
                />
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredAssessments && filteredAssessments.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center">
              <ClipboardCheck className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No assessments to grade
              </h3>
              <p className="text-sm text-muted-foreground">
                There are no pending assessments that need grading.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

