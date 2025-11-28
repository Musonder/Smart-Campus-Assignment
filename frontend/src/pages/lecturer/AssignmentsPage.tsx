import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Calendar, ClipboardList, PlusCircle, RefreshCw, HelpCircle, Link2, Edit, Trash2, X } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import apiClient, { getErrorMessage } from '@/lib/api-client'
import { toast } from 'sonner'

interface Section {
  id: string
  course_id: string
  course_code: string
  course_title: string
  section_number: string
  semester: string
}

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

interface CreateAssignmentPayload {
  section_id: string
  title: string
  description?: string
  type?: string
  due_date: string
  total_points: number
  external_task_id?: string
}

interface ExternalTask {
  id: string
  name: string
  course_code?: string | null
  course_title?: string | null
  description?: string | null
}

interface Question {
  id: string
  question_type: string
  question_text: string
  question_format: string
  options?: Record<string, string> | null
  correct_answer?: string
  points: number
  course_id?: string | null
}

export function LecturerAssignmentsPage() {
  const queryClient = useQueryClient()

  // Form state
  const [sectionId, setSectionId] = useState<string>('')
  const [title, setTitle] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [dueDate, setDueDate] = useState<string>('') // HTML datetime-local string
  const [totalPoints, setTotalPoints] = useState<number>(100)
  const [externalTaskId, setExternalTaskId] = useState<string>('')
  const [selectedExternalTaskId, setSelectedExternalTaskId] = useState<string>('')
  const [linkQuestionDialogOpen, setLinkQuestionDialogOpen] = useState(false)
  const [selectedAssignmentForQuestions, setSelectedAssignmentForQuestions] = useState<Assignment | null>(null)

  // Load lecturer sections to attach assignments
  const {
    data: sections,
    isLoading: sectionsLoading,
    isError: sectionsError,
  } = useQuery<Section[]>({
    queryKey: ['lecturer-sections'],
    queryFn: async () => {
      const response = await apiClient.get<Section[]>('/api/v1/lecturer/sections')
      return response.data || []
    },
    staleTime: 5 * 60 * 1000,
  })

  // Load existing assignments for the lecturer
  const {
    data: assignments,
    isLoading: assignmentsLoading,
    isError: assignmentsError,
  } = useQuery<Assignment[]>({
    queryKey: ['lecturer-assignments'],
    queryFn: async () => {
      const response = await apiClient.get<Assignment[]>('/api/v1/academic/assignments')
      return response.data || []
    },
    staleTime: 60 * 1000,
  })

  // Load external auto-grader tasks (e.g. INGInious tasks)
  const {
    data: externalTasks,
    isLoading: externalTasksLoading,
  } = useQuery<ExternalTask[]>({
    // Re-fetch when sectionId changes so adapter can filter by course
    queryKey: ['external-tasks', sectionId],
    queryFn: async () => {
      const params = sectionId ? { section_id: sectionId } : {}
      const response = await apiClient.get<ExternalTask[]>('/api/v1/academic/assignments/external-tasks', {
        params,
      })
      return response.data || []
    },
    enabled: !!sectionId, // only fetch once a section is chosen
    staleTime: 5 * 60 * 1000,
  })

  const sectionMap = new Map(sections?.map((s) => [s.id, s]) || [])

  const externalTasksForSection = useMemo(() => {
    if (!externalTasks || !sectionId) return externalTasks || []
    const section = sectionMap.get(sectionId)
    if (!section) return externalTasks
    // Prefer tasks that match course_code if provided by adapter
    return externalTasks
      .slice()
      .sort((a, b) => {
        const aMatch = a.course_code === section.course_code ? 1 : 0
        const bMatch = b.course_code === section.course_code ? 1 : 0
        return bMatch - aMatch
      })
  }, [externalTasks, sectionId, sectionMap])

  const createMutation = useMutation({
    mutationFn: async (payload: CreateAssignmentPayload) => {
      const response = await apiClient.post<Assignment>('/api/v1/academic/assignments', payload)
      return response.data
    },
    onSuccess: () => {
      toast.success('Assignment created successfully')
      queryClient.invalidateQueries({ queryKey: ['lecturer-assignments'] })
      // Reset form (keep section to speed up multiple creations)
      setTitle('')
      setDescription('')
      setDueDate('')
      setTotalPoints(100)
      setExternalTaskId('')
      setSelectedExternalTaskId('')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })

  const handleCreate = () => {
    if (!sectionId) {
      toast.error('Please select a section')
      return
    }
    if (!title.trim()) {
      toast.error('Please enter a title')
      return
    }
    if (!dueDate) {
      toast.error('Please select a due date')
      return
    }

    // If lecturer picked an external task from the dropdown, prefer that ID
    const effectiveExternalTaskId =
      selectedExternalTaskId || externalTaskId.trim() || undefined

    const isoDueDate = new Date(dueDate).toISOString()

    const payload: CreateAssignmentPayload = {
      section_id: sectionId,
      title: title.trim(),
      description: description.trim() || undefined,
      type: 'auto',
      due_date: isoDueDate,
      total_points: Number.isFinite(totalPoints) && totalPoints > 0 ? totalPoints : 100,
      external_task_id: effectiveExternalTaskId,
    }

    createMutation.mutate(payload)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Assignments</h1>
        <p className="text-muted-foreground mt-2">
          Create and manage assignments for your sections. Auto-graded tasks will be evaluated via the
          configured external grader (e.g. INGInious).
        </p>
      </div>

      {/* Create Assignment Form */}
      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-primary" />
            Create New Assignment
          </CardTitle>
          <CardDescription>
            Choose a section, define assignment details, and optionally link it to an INGInious task ID for
            automatic grading.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="section">Section</Label>
              <Select
                value={sectionId}
                onValueChange={(value) => setSectionId(value)}
                disabled={sectionsLoading || !!sectionsError}
              >
                <SelectTrigger id="section">
                  <SelectValue placeholder={sectionsLoading ? 'Loading sections...' : 'Select a section'} />
                </SelectTrigger>
                <SelectContent>
                  {sections?.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.course_code} – Sec {section.section_number} ({section.semester})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g. Assignment 1: OOP Fundamentals"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="points">Total Points</Label>
              <Input
                id="points"
                type="number"
                min={1}
                max={1000}
                value={totalPoints}
                onChange={(e) => setTotalPoints(parseInt(e.target.value || '0', 10))}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={4}
                placeholder="Brief instructions for students..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>INGInious Task (optional)</Label>
              <div className="space-y-2">
                <Select
                  value={selectedExternalTaskId}
                  onValueChange={(value) => setSelectedExternalTaskId(value)}
                  disabled={externalTasksLoading || !sectionId}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        !sectionId
                          ? 'Select a section first to load tasks'
                          : externalTasksLoading
                            ? 'Loading tasks from INGInious...'
                            : externalTasksForSection && externalTasksForSection.length > 0
                              ? 'Choose a task from INGInious (optional)'
                              : 'No tasks available from INGInious (optional)'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {externalTasksForSection?.map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.name} {task.course_code ? `(${task.course_code})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Input
                    id="externalTaskId"
                    placeholder="Or enter task ID manually, e.g. cs101-assignment-1"
                    value={externalTaskId}
                    onChange={(e) => setExternalTaskId(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={!sectionId}
                    onClick={() =>
                      queryClient.invalidateQueries({ queryKey: ['external-tasks', sectionId] })
                    }
                    title="Refresh tasks from INGInious"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tasks are fetched automatically from your configured INGInious adapter. You can also
                  override the ID manually if needed.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || sectionsLoading || !!sectionsError}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Assignment'}
            </Button>
          </div>

          {(sectionsError || assignmentsError) && (
            <p className="text-sm text-destructive">
              Some data could not be loaded. You can still create assignments, but lists may be incomplete.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Existing Assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Existing Assignments
          </CardTitle>
          <CardDescription>
            Overview of all assignments you have created across your sections.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assignmentsLoading ? (
            <p className="text-muted-foreground py-4">Loading assignments...</p>
          ) : !assignments || assignments.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <ClipboardList className="h-10 w-10 mx-auto mb-3" />
              <p className="font-medium">No assignments yet</p>
              <p className="text-sm">
                Create your first assignment using the form above.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment) => {
                const section = sectionMap.get(assignment.section_id)
                const due = new Date(assignment.due_date)
                const isPastDue = !Number.isNaN(due.getTime()) && due < new Date()

                return (
                  <Card
                    key={assignment.id}
                    className="border border-border/60 hover:shadow-sm transition-shadow"
                  >
                    <CardContent className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">
                            {assignment.title}
                          </h3>
                          <Badge variant="outline" className="text-xs">
                            {assignment.type === 'auto' ? 'Auto-graded' : assignment.type}
                          </Badge>
                          <Badge
                            variant={isPastDue ? 'destructive' : 'secondary'}
                            className="flex items-center gap-1 text-xs"
                          >
                            <Calendar className="h-3 w-3" />
                            {Number.isNaN(due.getTime())
                              ? 'No due date'
                              : due.toLocaleString()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {assignment.description || 'No description provided.'}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                          {section && (
                            <>
                              <span className="flex items-center gap-1">
                                <BookOpen className="h-3 w-3" />
                                {section.course_code} – Sec {section.section_number}
                              </span>
                              <span>· {section.course_title}</span>
                            </>
                          )}
                          <span>· {assignment.total_points} points</span>
                          {assignment.external_task_id && (
                            <span>· Task: {assignment.external_task_id}</span>
                          )}
                          <span className="capitalize">· Status: {assignment.status}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 min-w-[180px]">
                        <AssignmentQuestionsPreview assignmentId={assignment.id} />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedAssignmentForQuestions(assignment)
                            setLinkQuestionDialogOpen(true)
                          }}
                        >
                          <Link2 className="h-4 w-4 mr-2" />
                          Manage Questions
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Questions Management Section */}
      <Tabs defaultValue="create" className="space-y-4">
        <TabsList>
          <TabsTrigger value="create">Create Question</TabsTrigger>
          <TabsTrigger value="view">My Questions</TabsTrigger>
        </TabsList>
        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-primary" />
                Create New Question
              </CardTitle>
              <CardDescription>
                Create questions (rule questions or course content questions) and link them to assignments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QuestionManagementForm sections={sections || []} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="view">
          <QuestionList sections={sections || []} />
        </TabsContent>
      </Tabs>

      {/* Link Question to Assignment Dialog */}
      <LinkQuestionDialog
        open={linkQuestionDialogOpen}
        onOpenChange={setLinkQuestionDialogOpen}
        assignment={selectedAssignmentForQuestions}
        sections={sections || []}
      />
    </div>
  )
}

// Question Management Form Component
interface QuestionManagementFormProps {
  sections: Section[]
}

function QuestionManagementForm({ sections }: QuestionManagementFormProps) {
  const queryClient = useQueryClient()

  const [questionType, setQuestionType] = useState<'rule' | 'course_content'>('course_content')
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [questionText, setQuestionText] = useState('')
  const [questionFormat, setQuestionFormat] = useState<'multiple_choice' | 'true_false' | 'short_answer'>('multiple_choice')
  const [options, setOptions] = useState<Record<string, string>>({})
  const [correctAnswer, setCorrectAnswer] = useState('')
  const [points, setPoints] = useState(1)
  const [optionKey, setOptionKey] = useState('')
  const [optionValue, setOptionValue] = useState('')

  const createQuestionMutation = useMutation({
    mutationFn: async (payload: {
      course_id?: string
      question_type: string
      question_text: string
      question_format: string
      options?: Record<string, string>
      correct_answer: string
      points: number
    }) => {
      const response = await apiClient.post('/api/v1/academic/assignments/questions', payload)
      return response.data
    },
    onSuccess: () => {
      toast.success('Question created successfully')
      setQuestionText('')
      setOptions({})
      setCorrectAnswer('')
      setPoints(1)
      setOptionKey('')
      setOptionValue('')
      queryClient.invalidateQueries({ queryKey: ['lecturer-questions'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })

  const handleAddOption = () => {
    if (optionKey && optionValue) {
      setOptions((prev) => ({ ...prev, [optionKey.toUpperCase()]: optionValue }))
      setOptionKey('')
      setOptionValue('')
    }
  }

  const handleCreateQuestion = () => {
    if (!questionText.trim()) {
      toast.error('Please enter question text')
      return
    }
    if (!correctAnswer.trim()) {
      toast.error('Please enter the correct answer')
      return
    }
    if (questionType === 'course_content' && !selectedCourseId) {
      toast.error('Please select a course for course content questions')
      return
    }
    if (questionFormat === 'multiple_choice' && Object.keys(options).length < 2) {
      toast.error('Please add at least 2 options for multiple choice questions')
      return
    }

    const payload = {
      course_id: questionType === 'course_content' ? selectedCourseId : undefined,
      question_type: questionType,
      question_text: questionText.trim(),
      question_format: questionFormat,
      options: questionFormat === 'multiple_choice' ? options : undefined,
      correct_answer: correctAnswer.trim(),
      points,
    }

    // Debug logging for multiple choice questions (development only)
    if (import.meta.env.DEV && questionFormat === 'multiple_choice') {
      console.log('[Lecturer] Creating multiple choice question:', {
        question_text: payload.question_text,
        options: payload.options,
        optionsCount: payload.options ? Object.keys(payload.options).length : 0,
        correct_answer: payload.correct_answer,
      })
    }

    createQuestionMutation.mutate(payload)
  }

  const courseMap = new Map(sections.map((s) => [s.course_id, s]))

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Question Type</Label>
          <Select value={questionType} onValueChange={(v) => setQuestionType(v as 'rule' | 'course_content')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rule">Rule Question (applies to all courses)</SelectItem>
              <SelectItem value="course_content">Course Content Question</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {questionType === 'course_content' && (
          <div className="space-y-2">
            <Label>Course</Label>
            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent>
                {Array.from(courseMap.values()).map((section) => (
                  <SelectItem key={section.course_id} value={section.course_id}>
                    {section.course_code} - {section.course_title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>Question Format</Label>
          <Select value={questionFormat} onValueChange={(v) => setQuestionFormat(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
              <SelectItem value="true_false">True/False</SelectItem>
              <SelectItem value="short_answer">Short Answer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Points</Label>
          <Input
            type="number"
            min={1}
            max={100}
            value={points}
            onChange={(e) => setPoints(parseInt(e.target.value || '1', 10))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Question Text</Label>
        <Textarea
          placeholder="Enter your question here..."
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          rows={3}
        />
      </div>

      {questionFormat === 'multiple_choice' && (
        <div className="space-y-2">
          <Label>Options</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Option key (e.g., A)"
              value={optionKey}
              onChange={(e) => setOptionKey(e.target.value)}
              className="w-20"
            />
            <Input
              placeholder="Option text"
              value={optionValue}
              onChange={(e) => setOptionValue(e.target.value)}
              className="flex-1"
            />
            <Button type="button" variant="outline" onClick={handleAddOption}>
              Add
            </Button>
          </div>
          {Object.keys(options).length > 0 && (
            <div className="space-y-1">
              {Object.entries(options).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">{key}</Badge>
                  <span>{value}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newOptions = { ...options }
                      delete newOptions[key]
                      setOptions(newOptions)
                    }}
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label>Correct Answer</Label>
        {questionFormat === 'multiple_choice' ? (
          <Select value={correctAnswer} onValueChange={setCorrectAnswer}>
            <SelectTrigger>
              <SelectValue placeholder="Select correct option" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(options).map((key) => (
                <SelectItem key={key} value={key}>
                  {key}: {options[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : questionFormat === 'true_false' ? (
          <Select value={correctAnswer} onValueChange={setCorrectAnswer}>
            <SelectTrigger>
              <SelectValue placeholder="Select correct answer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">True</SelectItem>
              <SelectItem value="false">False</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Input
            placeholder="Enter the correct answer"
            value={correctAnswer}
            onChange={(e) => setCorrectAnswer(e.target.value)}
          />
        )}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleCreateQuestion}
          disabled={createQuestionMutation.isPending}
        >
          {createQuestionMutation.isPending ? 'Creating...' : 'Create Question'}
        </Button>
      </div>
    </div>
  )
}

// Link Question to Assignment Dialog
interface LinkQuestionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assignment: Assignment | null
  sections: Section[]
}

function LinkQuestionDialog({ open, onOpenChange, assignment, sections }: LinkQuestionDialogProps) {
  const queryClient = useQueryClient()
  const [selectedQuestionId, setSelectedQuestionId] = useState('')
  const [isRandom, setIsRandom] = useState(false)
  const [displayOrder, setDisplayOrder] = useState(0)

  // Get assignment's course ID for filtering
  const assignmentSection = sections.find((s) => s.id === assignment?.section_id)
  const assignmentCourseId = assignmentSection?.course_id

  // Fetch available questions - filter by course if assignment has a course
  const { data: availableQuestions, isLoading: questionsLoading } = useQuery<Question[]>({
    queryKey: ['lecturer-questions', assignmentCourseId],
    queryFn: async () => {
      const params: Record<string, string> = {}
      // Auto-filter by course if assignment has a course
      if (assignmentCourseId) {
        params.course_id = assignmentCourseId
      }
      const response = await apiClient.get<Question[]>('/api/v1/academic/assignments/questions', { params })
      return response.data || []
    },
    enabled: open,
  })

  // Fetch already linked questions
  const { data: linkedQuestions } = useQuery<Question[]>({
    queryKey: ['assignment-questions', assignment?.id],
    queryFn: async () => {
      if (!assignment) return []
      const response = await apiClient.get<Question[]>(
        `/api/v1/academic/assignments/${assignment.id}/questions?lecturer_view=true`
      )
      return response.data || []
    },
    enabled: open && !!assignment,
  })

  const linkedQuestionIds = new Set(linkedQuestions?.map((q) => q.id) || [])
  // Filter: show rule questions + course questions matching assignment's course
  const unlinkedQuestions = availableQuestions?.filter((q) => {
    if (linkedQuestionIds.has(q.id)) return false
    // Include rule questions (no course_id) or questions matching assignment's course
    if (q.question_type === 'rule') return true
    if (assignmentCourseId && q.course_id === assignmentCourseId) return true
    return false
  }) || []

  const linkMutation = useMutation({
    mutationFn: async (payload: { question_id: string; is_random: boolean; display_order: number }) => {
      if (!assignment) throw new Error('No assignment selected')
      const response = await apiClient.post(
        `/api/v1/academic/assignments/${assignment.id}/questions/link`,
        payload
      )
      return response.data
    },
    onSuccess: () => {
      toast.success('Question linked to assignment successfully')
      onOpenChange(false)
      setSelectedQuestionId('')
      setIsRandom(false)
      setDisplayOrder(0)
      queryClient.invalidateQueries({ queryKey: ['lecturer-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['assignment-questions', assignment?.id] })
      queryClient.invalidateQueries({ queryKey: ['lecturer-questions'] })
      queryClient.invalidateQueries({ queryKey: ['lecturer-questions', assignmentCourseId] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })

  const handleLink = () => {
    if (!selectedQuestionId) {
      toast.error('Please select a question')
      return
    }
    linkMutation.mutate({
      question_id: selectedQuestionId,
      is_random: isRandom,
      display_order: displayOrder,
    })
  }

  if (!assignment) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link Question to Assignment</DialogTitle>
          <DialogDescription>
            Link a question to "{assignment.title}". Students will see rule questions first, then course content questions.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Show linked questions */}
          {linkedQuestions && linkedQuestions.length > 0 && (
            <div className="space-y-2">
              <Label>Linked Questions ({linkedQuestions.length})</Label>
              <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-lg p-3">
                {linkedQuestions.map((q) => (
                  <LinkedQuestionItem
                    key={q.id}
                    question={q}
                    assignmentId={assignment.id}
                    onUnlink={() => {
                      queryClient.invalidateQueries({ queryKey: ['assignment-questions', assignment.id] })
                      queryClient.invalidateQueries({ queryKey: ['lecturer-questions', assignmentCourseId] })
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {questionsLoading ? (
            <p className="text-sm text-muted-foreground">Loading questions...</p>
          ) : unlinkedQuestions.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-sm text-muted-foreground mb-2">No available questions to link</p>
              <p className="text-xs text-muted-foreground">
                {assignmentCourseId
                  ? `Create questions for ${assignmentSection?.course_code} first using the "Create Question" tab above.`
                  : 'Create questions first using the "Create Question" tab above.'}
              </p>
            </div>
          ) : (
            <>
              {assignmentCourseId && (
                <div className="rounded-lg border p-3 bg-blue-50/50 border-blue-200">
                  <p className="text-xs font-medium text-blue-900">
                    💡 Auto-filtered: Showing questions for {assignmentSection?.course_code} and rule questions
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label>Select Question</Label>
                <Select value={selectedQuestionId} onValueChange={setSelectedQuestionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a question to link" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {unlinkedQuestions.map((q) => (
                      <SelectItem key={q.id} value={q.id}>
                        <div className="flex flex-col py-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {q.question_type === 'rule' ? '📋 Rule' : '📚 Course'} - {q.question_format}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {q.points} pts
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {q.question_text}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {unlinkedQuestions.length} {unlinkedQuestions.length === 1 ? 'question' : 'questions'} available
                </p>
              </div>
              {selectedQuestionId && (
                <div className="rounded-lg border p-3 bg-muted/50">
                  <p className="text-sm font-medium mb-1">Selected Question:</p>
                  <p className="text-sm text-muted-foreground">
                    {unlinkedQuestions.find((q) => q.id === selectedQuestionId)?.question_text}
                  </p>
                </div>
              )}
            </>
          )}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="random"
                checked={isRandom}
                onCheckedChange={(checked) => setIsRandom(checked === true)}
              />
              <Label htmlFor="random" className="text-sm font-normal">
                Random selection (for course content questions - will randomly pick from pool)
              </Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Display Order</Label>
            <Input
              type="number"
              min={0}
              value={displayOrder}
              onChange={(e) => setDisplayOrder(parseInt(e.target.value || '0', 10))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleLink}
            disabled={linkMutation.isPending || !selectedQuestionId || unlinkedQuestions.length === 0}
          >
            {linkMutation.isPending ? 'Linking...' : 'Link Question'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Question List Component
interface QuestionListProps {
  sections: Section[]
}

function QuestionList({ sections }: QuestionListProps) {
  const { data: questions, isLoading } = useQuery<Question[]>({
    queryKey: ['lecturer-questions'],
    queryFn: async () => {
      const response = await apiClient.get<Question[]>('/api/v1/academic/assignments/questions')
      const questionsData = response.data || []
      
      // Debug logging to verify questions and their options (development only)
      if (import.meta.env.DEV) {
        console.log('[Lecturer] Fetched questions:', questionsData.length)
        questionsData.forEach((q, index) => {
          console.log(`[Lecturer] Question ${index + 1}:`, {
            id: q.id,
            question_text: q.question_text.substring(0, 50) + '...',
            question_format: q.question_format,
            hasOptions: !!q.options,
            options: q.options,
            optionsType: typeof q.options,
            optionsKeys: q.options ? Object.keys(q.options) : [],
            correct_answer: q.correct_answer,
          })
        })
      }
      
      return questionsData
    },
  })

  const courseMap = new Map(sections.map((s) => [s.course_id, s]))

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-muted-foreground">Loading questions...</p>
        </CardContent>
      </Card>
    )
  }

  if (!questions || questions.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <HelpCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="font-medium text-foreground">No questions yet</p>
          <p className="text-sm text-muted-foreground">
            Create your first question using the "Create Question" tab.
          </p>
        </CardContent>
      </Card>
    )
  }

  const ruleQuestions = questions.filter((q) => q.question_type === 'rule')
  const courseQuestions = questions.filter((q) => q.question_type === 'course_content')

  return (
    <div className="space-y-4">
      {ruleQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📋 Rule Questions ({ruleQuestions.length})</CardTitle>
            <CardDescription>Questions that apply to all courses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ruleQuestions.map((q) => (
                <QuestionCard key={q.id} question={q} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {courseQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📚 Course Content Questions ({courseQuestions.length})</CardTitle>
            <CardDescription>Questions specific to courses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {courseQuestions.map((q) => {
                const section = q.course_id ? courseMap.get(q.course_id) : null
                return <QuestionCard key={q.id} question={q} courseInfo={section} />
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Question Card Component
interface QuestionCardProps {
  question: Question
  courseInfo?: Section | null
}

function QuestionCard({ question, courseInfo }: QuestionCardProps) {
  const queryClient = useQueryClient()
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/api/v1/academic/assignments/questions/${question.id}`)
    },
    onSuccess: () => {
      toast.success('Question deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['lecturer-questions'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this question? It will be archived if linked to assignments.')) {
      deleteMutation.mutate()
    }
  }

  return (
    <>
      <div className="border rounded-lg p-4 space-y-2 hover:bg-muted/50 transition-colors">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium text-foreground">{question.question_text}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline">{question.question_format}</Badge>
              <Badge variant="secondary">{question.points} {question.points === 1 ? 'point' : 'points'}</Badge>
              {courseInfo && (
                <Badge variant="outline" className="text-xs">
                  {courseInfo.course_code}
                </Badge>
              )}
              {question.question_type === 'rule' && (
                <Badge variant="default" className="text-xs">Rule Question</Badge>
              )}
            </div>
            {question.question_format === 'multiple_choice' && (
              question.options && Object.keys(question.options).length > 0 ? (
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Options:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(question.options).map(([key, value]) => (
                      <span key={key} className="text-xs bg-muted px-2 py-1 rounded">
                        <span className="font-medium">{key}:</span> {value}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-2 p-2 border border-destructive/50 rounded-lg bg-destructive/10">
                  <p className="text-xs text-destructive font-medium">
                    ⚠️ Missing options! This multiple choice question has no options defined.
                  </p>
                </div>
              )
            )}
            {question.correct_answer && (
              <div className="mt-2">
                <p className="text-xs font-medium text-muted-foreground">Correct Answer:</p>
                <p className="text-xs text-foreground font-mono bg-green-50 px-2 py-1 rounded inline-block">
                  {question.correct_answer}
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditDialogOpen(true)}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      <EditQuestionDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        question={question}
        courseInfo={courseInfo}
      />
    </>
  )
}

// Linked Question Item Component
interface LinkedQuestionItemProps {
  question: Question
  assignmentId: string
  onUnlink: () => void
}

function LinkedQuestionItem({ question, assignmentId, onUnlink }: LinkedQuestionItemProps) {
  const unlinkMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete(
        `/api/v1/academic/assignments/${assignmentId}/questions/${question.id}/unlink`
      )
    },
    onSuccess: () => {
      toast.success('Question unlinked successfully')
      onUnlink()
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })

  return (
    <div className="flex items-center justify-between p-2 rounded border bg-muted/30">
      <div className="flex-1">
        <p className="text-xs font-medium text-foreground line-clamp-1">{question.question_text}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-xs">{question.question_format}</Badge>
          <span className="text-xs text-muted-foreground">{question.points} pts</span>
          {question.question_type === 'rule' && (
            <Badge variant="default" className="text-xs">Rule</Badge>
          )}
        </div>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => unlinkMutation.mutate()}
        disabled={unlinkMutation.isPending}
        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}

// Edit Question Dialog
interface EditQuestionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  question: Question
  courseInfo?: Section | null
}

function EditQuestionDialog({ open, onOpenChange, question }: EditQuestionDialogProps) {
  const queryClient = useQueryClient()
  const sections = useQuery<Section[]>({
    queryKey: ['lecturer-sections'],
    queryFn: async () => {
      const response = await apiClient.get<Section[]>('/api/v1/lecturer/sections')
      return response.data || []
    },
  }).data || []

  const [questionType, setQuestionType] = useState<'rule' | 'course_content'>(question.question_type as any)
  const [selectedCourseId, setSelectedCourseId] = useState<string>(question.course_id || '')
  const [questionText, setQuestionText] = useState(question.question_text)
  const [questionFormat, setQuestionFormat] = useState<'multiple_choice' | 'true_false' | 'short_answer'>(question.question_format as any)
  const [options, setOptions] = useState<Record<string, string>>(question.options || {})
  const [correctAnswer, setCorrectAnswer] = useState(question.correct_answer || '')
  const [points, setPoints] = useState(question.points)
  const [optionKey, setOptionKey] = useState('')
  const [optionValue, setOptionValue] = useState('')

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      course_id?: string
      question_type: string
      question_text: string
      question_format: string
      options?: Record<string, string>
      correct_answer: string
      points: number
    }) => {
      const response = await apiClient.put(`/api/v1/academic/assignments/questions/${question.id}`, payload)
      return response.data
    },
    onSuccess: () => {
      toast.success('Question updated successfully')
      onOpenChange(false)
      queryClient.invalidateQueries({ queryKey: ['lecturer-questions'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })

  const handleAddOption = () => {
    if (optionKey && optionValue) {
      setOptions((prev) => ({ ...prev, [optionKey.toUpperCase()]: optionValue }))
      setOptionKey('')
      setOptionValue('')
    }
  }

  const handleUpdate = () => {
    if (!questionText.trim()) {
      toast.error('Please enter question text')
      return
    }
    if (!correctAnswer.trim()) {
      toast.error('Please enter the correct answer')
      return
    }
    if (questionType === 'course_content' && !selectedCourseId) {
      toast.error('Please select a course for course content questions')
      return
    }
    if (questionFormat === 'multiple_choice' && Object.keys(options).length < 2) {
      toast.error('Please add at least 2 options for multiple choice questions')
      return
    }

    const payload = {
      course_id: questionType === 'course_content' ? selectedCourseId : undefined,
      question_type: questionType,
      question_text: questionText.trim(),
      question_format: questionFormat,
      options: questionFormat === 'multiple_choice' ? options : undefined,
      correct_answer: correctAnswer.trim(),
      points,
    }

    updateMutation.mutate(payload)
  }

  const courseMap = new Map(sections.map((s) => [s.course_id, s]))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Question</DialogTitle>
          <DialogDescription>Update the question details below.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Question Type</Label>
              <Select value={questionType} onValueChange={(v) => setQuestionType(v as 'rule' | 'course_content')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rule">Rule Question (applies to all courses)</SelectItem>
                  <SelectItem value="course_content">Course Content Question</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {questionType === 'course_content' && (
              <div className="space-y-2">
                <Label>Course</Label>
                <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(courseMap.values()).map((section) => (
                      <SelectItem key={section.course_id} value={section.course_id}>
                        {section.course_code} - {section.course_title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Question Format</Label>
              <Select value={questionFormat} onValueChange={(v) => setQuestionFormat(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                  <SelectItem value="true_false">True/False</SelectItem>
                  <SelectItem value="short_answer">Short Answer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Points</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={points}
                onChange={(e) => setPoints(parseInt(e.target.value || '1', 10))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Question Text</Label>
            <Textarea
              placeholder="Enter your question here..."
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={3}
            />
          </div>

          {questionFormat === 'multiple_choice' && (
            <div className="space-y-2">
              <Label>Options</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Option key (e.g., A)"
                  value={optionKey}
                  onChange={(e) => setOptionKey(e.target.value)}
                  className="w-20"
                />
                <Input
                  placeholder="Option text"
                  value={optionValue}
                  onChange={(e) => setOptionValue(e.target.value)}
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={handleAddOption}>
                  Add
                </Button>
              </div>
              {Object.keys(options).length > 0 && (
                <div className="space-y-1">
                  {Object.entries(options).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">{key}</Badge>
                      <span>{value}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newOptions = { ...options }
                          delete newOptions[key]
                          setOptions(newOptions)
                        }}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Correct Answer</Label>
            {questionFormat === 'multiple_choice' ? (
              <Select value={correctAnswer} onValueChange={setCorrectAnswer}>
                <SelectTrigger>
                  <SelectValue placeholder="Select correct option" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(options).map((key) => (
                    <SelectItem key={key} value={key}>
                      {key}: {options[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : questionFormat === 'true_false' ? (
              <Select value={correctAnswer} onValueChange={setCorrectAnswer}>
                <SelectTrigger>
                  <SelectValue placeholder="Select correct answer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">True</SelectItem>
                  <SelectItem value="false">False</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder="Enter the correct answer"
                value={correctAnswer}
                onChange={(e) => setCorrectAnswer(e.target.value)}
              />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Updating...' : 'Update Question'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Assignment Questions Preview Component
interface AssignmentQuestionsPreviewProps {
  assignmentId: string
}

function AssignmentQuestionsPreview({ assignmentId }: AssignmentQuestionsPreviewProps) {
  const { data: questions, isLoading } = useQuery<Question[]>({
    queryKey: ['assignment-questions', assignmentId],
    queryFn: async () => {
      const response = await apiClient.get<Question[]>(
        `/api/v1/academic/assignments/${assignmentId}/questions?lecturer_view=true`
      )
      return response.data || []
    },
  })

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">Loading questions...</p>
  }

  if (!questions || questions.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No questions linked yet
      </p>
    )
  }

  const ruleCount = questions.filter((q) => q.question_type === 'rule').length
  const courseCount = questions.filter((q) => q.question_type === 'course_content').length
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0)

  return (
    <div className="text-xs text-muted-foreground space-y-1">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          {questions.length} {questions.length === 1 ? 'question' : 'questions'}
        </Badge>
        {ruleCount > 0 && (
          <span className="text-xs">📋 {ruleCount} rule</span>
        )}
        {courseCount > 0 && (
          <span className="text-xs">📚 {courseCount} course</span>
        )}
      </div>
      <p className="text-xs">Total: {totalPoints} points</p>
    </div>
  )
}


