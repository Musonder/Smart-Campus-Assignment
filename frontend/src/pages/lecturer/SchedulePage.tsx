/**
 * Lecturer Schedule Page
 * 
 * View teaching schedule and timetable
 */

import { useQuery } from '@tanstack/react-query'
import { Calendar, Clock, MapPin, BookOpen, Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import apiClient from '@/lib/api-client'
import { cn } from '@/lib/utils'

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const timeSlots = [
  '08:00', '09:00', '10:00', '11:00', '12:00', 
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
]

interface ScheduleClass {
  course_code: string
  course_title: string
  section_number: string
  start_time: string
  end_time: string
  days: string[]
  room_location?: string
  enrollment: number
  max_enrollment: number
}

export function LecturerSchedulePage() {
  // Fetch lecturer's sections
  const { data: sections, isLoading, isError, error } = useQuery({
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

  // Build schedule from sections
  const schedule: ScheduleClass[] = sections?.map((section: any) => ({
    course_code: section.course_code,
    course_title: section.course_title,
    section_number: section.section_number,
    start_time: section.start_time,
    end_time: section.end_time,
    days: section.schedule_days || [],
    room_location: section.room_id ? `Room ${section.room_id.substring(0, 8)}` : 'TBD',
    enrollment: section.current_enrollment,
    max_enrollment: section.max_enrollment,
  })) || []

  // Get classes for a specific day
  const getClassesForDay = (day: string) => {
    return schedule.filter((cls) => cls.days.includes(day))
  }

  // Get time slot for a class
  const getTimeSlot = (startTime: string) => {
    const [hours] = startTime.split(':').map(Number)
    return hours
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Schedule</h1>
        <p className="text-muted-foreground mt-2">
          View your teaching timetable and class schedule
        </p>
      </div>

      {/* Schedule Overview */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-4 text-muted-foreground">Loading schedule...</p>
          </CardContent>
        </Card>
      ) : isError ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Unable to Load Schedule
            </h3>
            <p className="text-muted-foreground mb-4">
              {error?.message || 'Failed to fetch schedule data'}
            </p>
            <button onClick={() => window.location.reload()}>Retry</button>
          </CardContent>
        </Card>
      ) : schedule.length > 0 ? (
        <>
          {/* Weekly Grid View */}
          <Card>
            <CardHeader>
              <CardTitle>Weekly Schedule</CardTitle>
              <CardDescription>
                Your classes for the week
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="grid grid-cols-8 gap-2 min-w-[800px]">
                  {/* Time column header */}
                  <div className="font-semibold text-sm text-muted-foreground p-2">Time</div>
                  {daysOfWeek.map((day) => (
                    <div key={day} className="font-semibold text-sm text-center text-muted-foreground p-2">
                      {day.substring(0, 3)}
                    </div>
                  ))}

                  {/* Time slots */}
                  {timeSlots.map((time) => {
                    const hour = parseInt(time.split(':')[0])
                    return (
                      <div key={time} className="contents">
                        <div className="text-xs text-muted-foreground p-2 text-right">
                          {time}
                        </div>
                        {daysOfWeek.map((day) => {
                          const classesForSlot = getClassesForDay(day).filter((cls) => {
                            const classStart = getTimeSlot(cls.start_time)
                            const classEnd = getTimeSlot(cls.end_time)
                            return hour >= classStart && hour < classEnd
                          })

                          return (
                            <div
                              key={`${day}-${time}`}
                              className={cn(
                                "min-h-[60px] p-1 border border-border rounded",
                                classesForSlot.length > 0 && "bg-primary/10 border-primary/20"
                              )}
                            >
                              {classesForSlot.map((cls, idx) => (
                                <div
                                  key={idx}
                                  className="text-xs p-1 bg-primary text-primary-foreground rounded mb-1"
                                >
                                  <div className="font-semibold">{cls.course_code}</div>
                                  <div className="opacity-90">Sec {cls.section_number}</div>
                                </div>
                              ))}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Class List */}
          <Card>
            <CardHeader>
              <CardTitle>Class Details</CardTitle>
              <CardDescription>
                Detailed information about your classes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {schedule.map((cls, idx) => (
                  <Card key={idx} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="font-mono">
                              {cls.course_code}
                            </Badge>
                            <Badge variant="secondary">
                              Section {cls.section_number}
                            </Badge>
                          </div>
                          <h3 className="text-lg font-semibold text-foreground mb-1">
                            {cls.course_title}
                          </h3>
                          <div className="space-y-2 mt-3">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>
                                {cls.days.join(', ')} • {cls.start_time} - {cls.end_time}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              <span>{cls.room_location}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Users className="h-4 w-4" />
                              <span>
                                {cls.enrollment} / {cls.max_enrollment} students
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Schedule Available
            </h3>
            <p className="text-muted-foreground">
              You don't have any classes scheduled yet. Contact your administrator to get assigned to courses.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

