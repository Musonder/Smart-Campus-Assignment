/**
 * Student Assignments Page
 *
 * Professional UI for students to view and take quiz assignments.
 * Uses real API endpoints:
 * - GET  /api/v1/academic/assignments/student
 * - GET  /api/v1/academic/assignments/{assignment_id}/questions
 * - POST /api/v1/academic/assignments/{assignment_id}/submissions
 */

import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, ClipboardList, Send, Search, CheckCircle2, HelpCircle, XCircle, Trophy, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import apiClient, { getErrorMessage } from '@/lib/api-client'

interface Assignment {
  id: string
  course_id: string
  section_id: string
  title: string
  description?: string | null
  type: string
  due_date: string
  total_points: number
  external_task_id?: string | null
  created_by_lecturer_id: string
  status: string
}

interface Submission {
  id: string
  assignment_id: string
  student_id: string
  submitted_at: string
  auto_score?: number | null
  lecturer_score?: number | null
  status: string
}

interface AnswerDetail {
  question_id: string
  question_text: string
  student_answer: string
  correct_answer: string
  is_correct: boolean
  points_earned: number
  points_possible: number
  feedback: string
}

interface Question {
  id: string
  question_type: string
  question_text: string
  question_format: string
  options?: Record<string, string> | null
  correct_answer?: string | null
  points: number
}

interface AnswerSubmission {
  question_id: string
  answer_text: string
}

export function AssignmentsPage() {
  const queryClient = useQueryClient()

  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all')
  const [quizDialogOpen, setQuizDialogOpen] = useState(false)
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [submissionResult, setSubmissionResult] = useState<any>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const {
    data: assignments,
    isLoading,
    isError,
    error,
  } = useQuery<Assignment[]>({
    queryKey: ['student-assignments'],
    queryFn: async () => {
      const response = await apiClient.get<Assignment[]>('/api/v1/academic/assignments/student')
      return response.data || []
    },
    staleTime: 60 * 1000,
  })

  // Note: Students can't directly access submissions endpoint
  // We'll track submission status locally after successful submission
  // For now, we'll check if assignment was submitted by checking localStorage or using a different approach
  const [submissionsMap, setSubmissionsMap] = useState<Record<string, Submission>>({})
  
  // Check localStorage for submission status (set after successful submission)
  useEffect(() => {
    if (assignments) {
      const stored = localStorage.getItem('assignment-submissions')
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          setSubmissionsMap(parsed)
        } catch (e) {
          // Invalid JSON, ignore
        }
      }
    }
  }, [assignments])

  const {
    data: questions,
    isLoading: questionsLoading,
    isError: questionsError,
  } = useQuery<Question[]>({
    queryKey: ['assignment-questions', selectedAssignment?.id],
    queryFn: async () => {
      if (!selectedAssignment) return []
      const response = await apiClient.get<Question[]>(
        `/api/v1/academic/assignments/${selectedAssignment.id}/questions`
      )
      const questionsData = response.data || []
      
      // Debug logging (development only)
      if (import.meta.env.DEV) {
        console.log('[Student Assignments] Fetched questions:', {
          count: questionsData.length,
          questions: questionsData.map(q => ({
            id: q.id,
            text: q.question_text.substring(0, 50) + '...',
            format: q.question_format,
            type: q.question_type,
          })),
          // Check for duplicates
          uniqueIds: new Set(questionsData.map(q => q.id)).size,
          hasDuplicates: new Set(questionsData.map(q => q.id)).size !== questionsData.length,
        })
      }
      
      // Remove duplicates by ID (just in case)
      const uniqueQuestions = Array.from(
        new Map(questionsData.map(q => [q.id, q])).values()
      )
      
      if (import.meta.env.DEV && uniqueQuestions.length !== questionsData.length) {
        console.warn('[Student Assignments] Removed duplicate questions:', {
          original: questionsData.length,
          unique: uniqueQuestions.length,
        })
      }
      
      return uniqueQuestions
    },
    enabled: !!selectedAssignment && quizDialogOpen,
    staleTime: 0, // Always fetch fresh questions
  })

  const submitMutation = useMutation({
    mutationFn: async ({ assignmentId, answersList }: { assignmentId: string; answersList: AnswerSubmission[] }) => {
      const response = await apiClient.post(`/api/v1/academic/assignments/${assignmentId}/submissions`, {
        answers: answersList,
      })
      return response.data
    },
    onSuccess: (data) => {
      // Store submission status in localStorage and state
      if (selectedAssignment) {
        const submission: Submission = {
          id: data.id,
          assignment_id: selectedAssignment.id,
          student_id: data.student_id,
          submitted_at: data.submitted_at,
          auto_score: data.auto_score,
          lecturer_score: data.lecturer_score,
          status: data.status,
        }
        setSubmissionsMap(prev => {
          const updated = { ...prev, [selectedAssignment.id]: submission }
          localStorage.setItem('assignment-submissions', JSON.stringify(updated))
          return updated
        })
        
        // Store submission result to show in results dialog
        setSubmissionResult({
          ...data,
          assignment: selectedAssignment,
          questions: questions,
          answers: answers,
        })
      }
      
      // Close quiz dialog and show results
      setQuizDialogOpen(false)
      setResultsDialogOpen(true)
      setAnswers({})
      queryClient.invalidateQueries({ queryKey: ['student-assignments'] })
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })

  const now = new Date()

  // Helper function to get assignment status
  const getAssignmentStatus = (assignment: Assignment) => {
    const due = new Date(assignment.due_date)
    const submission = submissionsMap?.[assignment.id]
    const hoursUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    if (submission) {
      if (submission.status === 'approved' || submission.lecturer_score !== null) {
        return { status: 'graded', label: 'Graded', variant: 'default' as const }
      }
      return { status: 'submitted', label: 'Submitted', variant: 'secondary' as const }
    }
    
    if (Number.isNaN(due.getTime())) {
      return { status: 'not_attempted', label: 'Not Attempted', variant: 'outline' as const }
    }
    
    if (due < now) {
      return { status: 'past_due', label: 'Past Due', variant: 'destructive' as const }
    }
    
    if (hoursUntilDue <= 24 && hoursUntilDue > 0) {
      return { status: 'due_soon', label: 'Due Soon', variant: 'destructive' as const }
    }
    
    return { status: 'not_attempted', label: 'Not Attempted', variant: 'outline' as const }
  }

  const filteredAssignments = (assignments || [])
    .filter((a) => {
      if (!searchTerm.trim()) return true
      const term = searchTerm.toLowerCase()
      return (
        a.title.toLowerCase().includes(term) ||
        (a.description || '').toLowerCase().includes(term) ||
        (a.external_task_id || '').toLowerCase().includes(term)
      )
    })
    .filter((a) => {
      if (filter === 'all') return true
      const due = new Date(a.due_date)
      if (Number.isNaN(due.getTime())) return true
      return filter === 'upcoming' ? due >= now : due < now
    })
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())

  const openQuizDialog = (assignment: Assignment) => {
    const due = new Date(assignment.due_date)
    if (!Number.isNaN(due.getTime()) && due < now) {
      toast.error('This assignment is already due')
      return
    }
    // Clear previous answers and set new assignment
    setAnswers({})
    setSelectedAssignment(assignment)
    setQuizDialogOpen(true)
    
    // Debug logging (development only)
    if (import.meta.env.DEV) {
      console.log('[Student Assignments] Opening quiz dialog for assignment:', {
        assignmentId: assignment.id,
        assignmentTitle: assignment.title,
        answersCleared: true,
      })
    }
  }

  const handleAnswerChange = (questionId: string, answer: string) => {
    if (import.meta.env.DEV) {
      console.log('[Student Assignments] Answer changed:', {
        questionId,
        answer,
        previousAnswers: answers,
      })
    }
    setAnswers((prev) => {
      const newAnswers = { ...prev, [questionId]: answer }
      if (import.meta.env.DEV) {
        console.log('[Student Assignments] Updated answers state:', newAnswers)
      }
      return newAnswers
    })
  }

  const handleSubmit = () => {
    if (!selectedAssignment || !questions || questions.length === 0) return

    // Debug logging (development only)
    if (import.meta.env.DEV) {
      console.log('[Student Assignments] Submit validation:', {
        totalQuestions: questions.length,
        questionIds: questions.map(q => q.id),
        answersProvided: Object.keys(answers),
        answersState: answers,
      })
    }

    // Check all questions are answered
    const unanswered = questions.filter((q) => !answers[q.id] || !answers[q.id].trim())
    if (unanswered.length > 0) {
      const unansweredDetails = unanswered.map(q => ({
        id: q.id,
        text: q.question_text.substring(0, 50) + '...',
        format: q.question_format,
      }))
      
      if (import.meta.env.DEV) {
        console.log('[Student Assignments] Unanswered questions:', unansweredDetails)
      }
      
      toast.error(`Please answer all ${unanswered.length} remaining question(s)`)
      return
    }

    const answersList: AnswerSubmission[] = questions.map((q) => ({
      question_id: q.id,
      answer_text: answers[q.id] || '',
    }))

    submitMutation.mutate({ assignmentId: selectedAssignment.id, answersList })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Assignments</h1>
        <p className="text-muted-foreground mt-2">
          View all assignments assigned to your enrolled sections and take quizzes online.
        </p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, description, or task ID..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'upcoming' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('upcoming')}
          >
            Upcoming
          </Button>
          <Button
            variant={filter === 'past' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('past')}
          >
            Past Due
          </Button>
        </div>
      </div>

      {/* Content */}
      {isError && (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-lg font-semibold text-foreground mb-2">Unable to load assignments</p>
            <p className="text-sm text-muted-foreground mb-4">
              {(error as Error)?.message || 'An error occurred while fetching assignments.'}
            </p>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['student-assignments'] })}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">Loading assignments...</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Assigned Work
            </CardTitle>
            <CardDescription>
              {filteredAssignments.length > 0
                ? 'Assignments from all your enrolled courses.'
                : 'No assignments available yet.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredAssignments.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                <ClipboardList className="h-10 w-10 mx-auto mb-3" />
                <p className="font-medium">You currently have no assignments.</p>
                <p className="text-sm">
                  New assignments from your lecturers will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAssignments.map((assignment) => {
                  const due = new Date(assignment.due_date)
                  const isPastDue = !Number.isNaN(due.getTime()) && due < now
                  const statusInfo = getAssignmentStatus(assignment)
                  const submission = submissionsMap?.[assignment.id]

                  return (
                    <Card
                      key={assignment.id}
                      className="border border-border/60 hover:shadow-sm transition-shadow"
                    >
                      <CardContent className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-foreground">{assignment.title}</h3>
                            <Badge
                              variant={statusInfo.variant}
                              className="flex items-center gap-1 text-xs"
                            >
                              {statusInfo.label}
                            </Badge>
                            <Badge
                              variant={isPastDue ? 'destructive' : 'secondary'}
                              className="flex items-center gap-1 text-xs"
                            >
                              <Calendar className="h-3 w-3" />
                              {Number.isNaN(due.getTime())
                                ? 'No due date'
                                : due.toLocaleDateString()}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {assignment.type === 'auto' ? 'Auto-graded' : assignment.type}
                            </Badge>
                            {submission && submission.auto_score !== null && (
                              <Badge variant="default" className="text-xs">
                                Score: {submission.auto_score}/{assignment.total_points}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {assignment.description || 'No description provided.'}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                            <span>{assignment.total_points} points</span>
                            {assignment.external_task_id && (
                              <span>· Task ID: {assignment.external_task_id}</span>
                            )}
                            <span className="capitalize">· Status: {assignment.status}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-stretch md:items-end gap-2 min-w-[160px]">
                          {submission ? (
                            <div className="space-y-2">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Submitted
                              </Button>
                              {submission.auto_score !== null && (
                                <p className="text-xs text-center text-muted-foreground">
                                  Auto-graded: {submission.auto_score}/{assignment.total_points} points
                                </p>
                              )}
                            </div>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                disabled={isPastDue || submitMutation.isPending}
                                onClick={() => openQuizDialog(assignment)}
                              >
                                <Send className="h-4 w-4 mr-2" />
                                {isPastDue ? 'Past Due' : 'Take Assignment'}
                              </Button>
                              {isPastDue && (
                                <span className="text-xs text-destructive text-center">
                                  This assignment is past its due date.
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quiz Dialog */}
      <Dialog open={quizDialogOpen} onOpenChange={setQuizDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Take Assignment: {selectedAssignment?.title}</DialogTitle>
            <DialogDescription>
              Answer all questions below. Rule questions appear first, followed by course content questions.
            </DialogDescription>
            {questions && questions.length > 0 && (
              <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Progress: {Object.keys(answers).filter(id => answers[id] && answers[id].trim()).length} of {questions.length} questions answered
                  </span>
                  <span className="font-medium">
                    {Math.round((Object.keys(answers).filter(id => answers[id] && answers[id].trim()).length / questions.length) * 100)}%
                  </span>
                </div>
              </div>
            )}
          </DialogHeader>

          {questionsLoading && (
            <div className="py-10 text-center text-muted-foreground">Loading questions...</div>
          )}

          {questionsError && (
            <div className="py-10 text-center">
              <p className="text-destructive mb-2">Failed to load questions</p>
              <p className="text-sm text-muted-foreground">
                {getErrorMessage(questionsError)}
              </p>
            </div>
          )}

          {!questionsLoading && !questionsError && questions && questions.length > 0 && (
            <div className="space-y-6 py-4">
              {questions.map((question, index) => {
                const isRuleQuestion = question.question_type === 'rule'
                const answerValue = answers[question.id] || ''

                // Debug logging for multiple choice questions (development only)
                if (import.meta.env.DEV && question.question_format === 'multiple_choice') {
                  console.log(`[Student Assignments] Question ${index + 1}:`, {
                    id: question.id,
                    format: question.question_format,
                    hasOptions: !!question.options,
                    options: question.options,
                    optionsType: typeof question.options,
                    optionsKeys: question.options ? Object.keys(question.options) : [],
                  })
                }

                return (
                  <Card key={question.id} className={isRuleQuestion ? 'border-blue-200 bg-blue-50/50' : ''}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">
                          {isRuleQuestion ? '📋 Rule Question' : '📚 Course Question'} {index + 1}
                        </CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {question.points} {question.points === 1 ? 'point' : 'points'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm font-medium text-foreground">{question.question_text}</p>

                      {question.question_format === 'multiple_choice' ? (
                        question.options && Object.keys(question.options).length > 0 ? (
                          <div className="space-y-3">
                            <p className="text-xs text-muted-foreground italic">
                              Select one answer only
                            </p>
                            <RadioGroup
                              value={answerValue}
                              onValueChange={(value) => handleAnswerChange(question.id, value)}
                              name={`question-${question.id}`}
                            >
                              {Object.entries(question.options).map(([key, option]) => (
                                <div key={key} className="flex items-center space-x-2">
                                  <RadioGroupItem 
                                    value={key} 
                                    id={`${question.id}-${key}`}
                                    name={`question-${question.id}`}
                                  />
                                  <Label
                                    htmlFor={`${question.id}-${key}`}
                                    className="text-sm font-normal cursor-pointer flex-1"
                                  >
                                    {key}. {option}
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                          </div>
                        ) : (
                          <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10">
                            <p className="text-sm text-destructive">
                              ⚠️ This multiple choice question is missing options. Please contact your instructor.
                            </p>
                          </div>
                        )
                      ) : null}

                      {question.question_format === 'true_false' && (
                        <RadioGroup
                          value={answerValue}
                          onValueChange={(value) => handleAnswerChange(question.id, value)}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="true" id={`${question.id}-true`} />
                            <Label
                              htmlFor={`${question.id}-true`}
                              className="text-sm font-normal cursor-pointer"
                            >
                              True
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="false" id={`${question.id}-false`} />
                            <Label
                              htmlFor={`${question.id}-false`}
                              className="text-sm font-normal cursor-pointer"
                            >
                              False
                            </Label>
                          </div>
                        </RadioGroup>
                      )}

                      {question.question_format === 'short_answer' && (
                        <Textarea
                          placeholder="Type your answer here..."
                          value={answerValue}
                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                          rows={3}
                        />
                      )}

                      <div className="flex items-center justify-between">
                        {answerValue ? (
                          <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Answer provided</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>No answer yet</span>
                          </div>
                        )}
                        <span className="text-xs text-muted-foreground">
                          Question {index + 1} of {questions.length}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {!questionsLoading && !questionsError && questions && questions.length === 0 && (
            <div className="py-10 text-center space-y-2">
              <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium text-foreground">No questions available yet</p>
              <p className="text-sm text-muted-foreground">
                The lecturer hasn't added questions to this assignment yet. Please check back later or contact your instructor.
              </p>
            </div>
          )}

          <DialogFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setQuizDialogOpen(false)}
              disabled={submitMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitMutation.isPending || !questions || questions.length === 0}
            >
              {submitMutation.isPending ? 'Submitting...' : 'Submit Answers'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Results Dialog - Show after submission */}
      <Dialog open={resultsDialogOpen} onOpenChange={setResultsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Assignment Results: {submissionResult?.assignment?.title}
            </DialogTitle>
            <DialogDescription>
              Your submission has been auto-graded. Review your results below.
            </DialogDescription>
          </DialogHeader>

          {submissionResult && (
            <div className="space-y-6 py-4">
              {/* Score Summary */}
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="py-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Your Score</p>
                      <p className="text-4xl font-bold text-foreground">
                        {submissionResult.auto_score || 0} / {submissionResult.assignment?.total_points || 0}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {submissionResult.assignment?.total_points 
                          ? Math.round(((submissionResult.auto_score || 0) / submissionResult.assignment.total_points) * 100)
                          : 0}% Correct
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={submissionResult.status === 'auto_graded' ? 'default' : 'secondary'} className="text-lg px-4 py-2">
                        {submissionResult.status === 'auto_graded' ? 'Auto-Graded' : submissionResult.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-2">
                        Pending lecturer approval
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Auto Feedback */}
              {submissionResult.auto_feedback && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Auto Feedback</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{submissionResult.auto_feedback}</p>
                  </CardContent>
                </Card>
              )}

              {/* Question Results */}
              {submissionResult.answer_details && submissionResult.answer_details.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground">Question Review</h3>
                  {submissionResult.answer_details.map((answerDetail: AnswerDetail, index: number) => (
                    <Card key={answerDetail.question_id} className={answerDetail.is_correct ? 'border-green-200 bg-green-50/50 dark:bg-green-950/20' : 'border-red-200 bg-red-50/50 dark:bg-red-950/20'}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            {answerDetail.is_correct ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600" />
                            )}
                            Question {index + 1} ({answerDetail.points_possible} {answerDetail.points_possible === 1 ? 'point' : 'points'})
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge variant={answerDetail.is_correct ? 'default' : 'destructive'}>
                              {answerDetail.is_correct ? 'Correct' : 'Incorrect'}
                            </Badge>
                            <Badge variant="outline">
                              {answerDetail.points_earned} / {answerDetail.points_possible} pts
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium">Question</Label>
                          <p className="text-sm text-foreground mt-1">{answerDetail.question_text}</p>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium">Your Answer</Label>
                          <p className={`text-sm mt-1 font-mono px-2 py-1 rounded ${
                            answerDetail.is_correct 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100 border border-green-200' 
                              : 'bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-100 border border-red-200'
                          }`}>
                            {answerDetail.student_answer || 'No answer provided'}
                          </p>
                        </div>
                        
                        {!answerDetail.is_correct && (
                          <div>
                            <Label className="text-sm font-medium text-green-600 dark:text-green-400">Correct Answer</Label>
                            <p className="text-sm text-green-600 dark:text-green-400 mt-1 font-mono bg-green-50 dark:bg-green-950/30 px-2 py-1 rounded border border-green-200 dark:border-green-800">
                              {answerDetail.correct_answer}
                            </p>
                          </div>
                        )}
                        
                        {answerDetail.feedback && (
                          <div className="p-2 bg-muted rounded">
                            <p className="text-xs text-muted-foreground">{answerDetail.feedback}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : submissionResult.questions && submissionResult.questions.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground">Question Review</h3>
                  {submissionResult.questions.map((question: Question, index: number) => {
                    const studentAnswer = submissionResult.answers[question.id] || ''
                    const isCorrect = question.correct_answer && 
                      studentAnswer.trim().toUpperCase() === question.correct_answer.trim().toUpperCase()
                    
                    return (
                      <Card key={question.id} className={isCorrect ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                              {isCorrect ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-600" />
                              )}
                              Question {index + 1} ({question.points} {question.points === 1 ? 'point' : 'points'})
                            </CardTitle>
                            <Badge variant={isCorrect ? 'default' : 'destructive'}>
                              {isCorrect ? 'Correct' : 'Incorrect'}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <Label className="text-sm font-medium">Question</Label>
                            <p className="text-sm text-foreground mt-1">{question.question_text}</p>
                          </div>
                          
                          <div>
                            <Label className="text-sm font-medium">Your Answer</Label>
                            <p className="text-sm text-foreground mt-1 font-mono bg-muted px-2 py-1 rounded">
                              {studentAnswer || 'No answer provided'}
                            </p>
                          </div>
                          
                          {!isCorrect && question.correct_answer && (
                            <div>
                              <Label className="text-sm font-medium text-green-600">Correct Answer</Label>
                              <p className="text-sm text-green-600 mt-1 font-mono bg-green-50 px-2 py-1 rounded border border-green-200">
                                {question.correct_answer}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              ) : null}

              <div className="flex items-center gap-2 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  Your score is pending lecturer approval. The lecturer may review and adjust your grade if needed.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => {
              setResultsDialogOpen(false)
              setSelectedAssignment(null)
              setSubmissionResult(null)
            }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
