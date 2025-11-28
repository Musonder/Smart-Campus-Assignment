/**
 * Lecturer Grading Page
 * 
 * Grade student assessments and assignments
 */

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardCheck, Search, Filter, Users, CheckCircle2, Calendar } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import apiClient, { getErrorMessage } from '@/lib/api-client'
import { toast } from 'sonner'

interface Submission {
  id: string
  assignment_id: string
  student_id: string
  submitted_at: string
  auto_score?: number | null
  lecturer_score?: number | null
  auto_feedback?: string | null
  lecturer_feedback?: string | null
  status: string
}

export function LecturerGradingPage() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null)
  const [gradingDialogOpen, setGradingDialogOpen] = useState(false)
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [lecturerScore, setLecturerScore] = useState<string>('')
  const [lecturerFeedback, setLecturerFeedback] = useState<string>('')

  // Fetch assignments created by the lecturer
  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['lecturer-assignments'],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/academic/assignments')
      return response.data || []
    },
  })

  // For each assignment, fetch submissions
  const { data: assignmentsWithSubmissions, isLoading: submissionsLoading } = useQuery({
    queryKey: ['lecturer-assignments-with-submissions', assignments?.map((a: any) => a.id).join(',')],
    queryFn: async () => {
      if (!assignments || assignments.length === 0) return []
      
      const assignmentsData = await Promise.all(
        (assignments as any[]).map(async (assignment: any) => {
          try {
            const submissionsResponse = await apiClient.get(
              `/api/v1/academic/assignments/${assignment.id}/submissions`
            )
            const submissions = submissionsResponse.data || []
            return {
              ...assignment,
              submissions_count: submissions.length,
              graded_count: submissions.filter((s: any) => s.status === 'approved' || s.lecturer_score !== null).length,
              submissions: submissions,
            }
          } catch (error) {
            return {
              ...assignment,
              submissions_count: 0,
              graded_count: 0,
              submissions: [],
            }
          }
        })
      )
      return assignmentsData
    },
    enabled: !!assignments && assignments.length > 0,
  })

  const isLoading = assignmentsLoading || submissionsLoading
  const isError = false // Handle errors individually

  const filteredAssessments = assignmentsWithSubmissions?.filter((assessment: any) =>
    assessment.title.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

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
                Failed to fetch assessment data
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

        {filteredAssessments.map((assessment: any) => {
          const dueDate = new Date(assessment.due_date)
          const isPastDue = !Number.isNaN(dueDate.getTime()) && dueDate < new Date()
          const gradingProgress = assessment.submissions_count > 0
            ? (assessment.graded_count / assessment.submissions_count) * 100
            : 0
          
          return (
            <Card key={assessment.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{assessment.title}</CardTitle>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>Due: {new Date(assessment.due_date).toLocaleDateString()}</span>
                        {isPastDue && (
                          <Badge variant="destructive" className="ml-2 text-xs">Past Due</Badge>
                        )}
                      </div>
                      <span>•</span>
                      <Badge variant="outline">{assessment.type === 'auto' ? 'Auto-graded' : assessment.type}</Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  {/* Statistics Cards */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Points</p>
                    <p className="text-2xl font-bold text-foreground">{assessment.total_points}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Submissions</p>
                    <p className="text-2xl font-bold text-foreground">
                      {assessment.submissions_count}
                      {assessment.submissions_count > 0 && (
                        <span className="text-sm font-normal text-muted-foreground ml-2">
                          ({assessment.graded_count} graded)
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Progress</p>
                    <p className="text-2xl font-bold text-foreground">
                      {Math.round(gradingProgress)}%
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                    <span>Grading Progress</span>
                    <span>{assessment.graded_count} of {assessment.submissions_count} approved</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-3">
                    <div
                      className="bg-primary h-3 rounded-full transition-all flex items-center justify-end pr-2"
                      style={{ width: `${gradingProgress}%` }}
                    >
                      {gradingProgress > 10 && (
                        <span className="text-xs text-primary-foreground font-medium">
                          {Math.round(gradingProgress)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="flex justify-end">
                  <Button 
                    onClick={() => {
                      setSelectedAssignment(assessment)
                      setGradingDialogOpen(true)
                    }}
                    disabled={assessment.submissions_count === 0}
                    className="min-w-[200px]"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    {assessment.submissions_count === 0 
                      ? 'No Submissions Yet' 
                      : `Review ${assessment.submissions_count} Submission${assessment.submissions_count !== 1 ? 's' : ''}`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}

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

      {/* Grading Dialog */}
      <Dialog open={gradingDialogOpen} onOpenChange={setGradingDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submissions: {selectedAssignment?.title}</DialogTitle>
            <DialogDescription>
              Review and grade student submissions for this assignment
            </DialogDescription>
          </DialogHeader>

          {selectedAssignment && (
            <div className="space-y-4">
              {selectedAssignment.submissions && selectedAssignment.submissions.length > 0 ? (
                <div className="space-y-4">
                  {selectedAssignment.submissions.map((submission: Submission) => {
                    const isApproved = submission.status === 'approved' || submission.lecturer_score !== null
                    const autoScore = submission.auto_score ?? 0
                    const autoScorePercentage = autoScore > 0 && selectedAssignment.total_points > 0
                      ? Math.round((autoScore / selectedAssignment.total_points) * 100)
                      : 0
                    
                    return (
                      <Card key={submission.id} className={isApproved ? 'border-green-200 bg-green-50/30' : ''}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-base flex items-center gap-2">
                                Student Submission
                                {isApproved && (
                                  <Badge variant="default" className="bg-green-600">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Approved
                                  </Badge>
                                )}
                              </CardTitle>
                              <CardDescription>
                                Submitted: {new Date(submission.submitted_at).toLocaleString()}
                              </CardDescription>
                            </div>
                            <Badge variant={isApproved ? 'default' : 'secondary'}>
                              {submission.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Auto Score Display */}
                          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
                            <CardContent className="py-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-1 block">
                                    Auto-Graded Score
                                  </Label>
                                  <div className="flex items-baseline gap-2">
                                    <p className="text-3xl font-bold text-foreground">
                                      {autoScore > 0 ? autoScore.toFixed(1) : 'N/A'}
                                    </p>
                                    <p className="text-lg text-muted-foreground">
                                      / {selectedAssignment.total_points}
                                    </p>
                                    <Badge variant="outline" className="ml-2">
                                      {autoScorePercentage}%
                                    </Badge>
                                  </div>
                                </div>
                                {submission.auto_score !== null && (
                                  <div className="text-right">
                                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                                    <Badge variant={isApproved ? 'default' : 'secondary'}>
                                      {isApproved ? 'Approved' : 'Pending Approval'}
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        
                          {submission.auto_feedback && (
                            <div className="p-3 bg-muted rounded-lg">
                              <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
                                Auto Feedback
                              </Label>
                              <p className="text-sm text-foreground">{submission.auto_feedback}</p>
                            </div>
                          )}

                          {/* Lecturer Override Section */}
                          <div className="border-t pt-4 space-y-4">
                            <div>
                              <Label className="text-sm font-semibold mb-2 block">
                                Lecturer Override (Optional)
                              </Label>
                              <p className="text-xs text-muted-foreground mb-3">
                                You can override the auto score if needed. Leave empty to approve the auto score.
                              </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor={`score-${submission.id}`}>Override Score</Label>
                                <Input
                                  id={`score-${submission.id}`}
                                  type="number"
                                  placeholder={`Auto: ${submission.auto_score || 0}`}
                                  value={selectedSubmission?.id === submission.id ? lecturerScore : ''}
                                  onChange={(e) => {
                                    setSelectedSubmission(submission)
                                    setLecturerScore(e.target.value)
                                    if (!lecturerFeedback) {
                                      setLecturerFeedback(submission.lecturer_feedback || '')
                                    }
                                  }}
                                  max={selectedAssignment.total_points}
                                  min={0}
                                  step="0.1"
                                />
                                <p className="text-xs text-muted-foreground">
                                  Leave empty to use auto score: {autoScore} / {selectedAssignment.total_points}
                                </p>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor={`feedback-${submission.id}`}>Lecturer Feedback</Label>
                                <Textarea
                                  id={`feedback-${submission.id}`}
                                  placeholder="Add feedback for the student (optional)"
                                  value={selectedSubmission?.id === submission.id ? lecturerFeedback : ''}
                                  onChange={(e) => {
                                    setSelectedSubmission(submission)
                                    setLecturerFeedback(e.target.value)
                                    if (!lecturerScore) {
                                      setLecturerScore('')
                                    }
                                  }}
                                  rows={3}
                                />
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                onClick={async () => {
                                  try {
                                    const finalScore = lecturerScore 
                                      ? parseFloat(lecturerScore) 
                                      : autoScore
                                    
                                    if (finalScore <= 0 && !lecturerScore) {
                                      toast.error('No score available to approve')
                                      return
                                    }

                                    await apiClient.post(
                                      `/api/v1/academic/assignments/submissions/${submission.id}/approve`,
                                      {
                                        lecturer_score: lecturerScore ? parseFloat(lecturerScore) : null,
                                        lecturer_feedback: lecturerFeedback || null,
                                      }
                                    )
                                    toast.success('Submission approved successfully!', {
                                      description: `Score: ${finalScore} / ${selectedAssignment.total_points}`,
                                    })
                                    queryClient.invalidateQueries({ queryKey: ['lecturer-assignments-with-submissions'] })
                                    setSelectedSubmission(null)
                                    setLecturerScore('')
                                    setLecturerFeedback('')
                                  } catch (error) {
                                    toast.error(getErrorMessage(error))
                                  }
                                }}
                                disabled={!selectedSubmission || selectedSubmission.id !== submission.id}
                                className="flex-1"
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                {isApproved ? 'Update Approval' : 'Approve & Finalize Grade'}
                              </Button>
                            </div>
                          </div>
                      </CardContent>
                    </Card>
                    )
                  })}
                </div>
              ) : (
                <div className="py-10 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3" />
                  <p>No submissions yet for this assignment</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

