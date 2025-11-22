/**
 * Timetable Page
 * 
 * Weekly class schedule view with all enrolled courses
 */

import { useQuery } from '@tanstack/react-query'
import { Calendar, Clock, MapPin, User, BookOpen } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { academicService } from '@/services/academic.service'
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
  instructor_name?: string
  room_location?: string
  start_time: string
  end_time: string
  days: string[]
  color: string
}

export function TimetablePage() {
  // Fetch enrollments to build schedule
  const { data: enrollments, isLoading, isError, error } = useQuery({
    queryKey: ['myEnrollments'],
    queryFn: () => academicService.getMyEnrollments(),
    retry: 2,
  })

  // Build schedule from REAL enrollment data
  const schedule: ScheduleClass[] = enrollments
    ?.filter(e => e.enrollment_status === 'enrolled' && !e.is_waitlisted)
    .map((enrollment, index) => ({
      course_code: enrollment.course_code,
      course_title: enrollment.course_title,
      section_number: enrollment.section_number,
      instructor_name: enrollment.instructor_id
        ? `Instructor ${enrollment.instructor_id.substring(0, 8)}`
        : 'TBD',
      room_location: enrollment.room_id
        ? `Room ${enrollment.room_id.substring(0, 8)}`
        : 'TBD',
      start_time: enrollment.start_time,
      end_time: enrollment.end_time,
      // Ensure days is always a valid array to avoid runtime errors
      days: Array.isArray(enrollment.schedule_days)
        ? enrollment.schedule_days
        : [],
      color: ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500'][index % 5]
    })) || []

  // Get classes for a specific day
  const getClassesForDay = (day: string): ScheduleClass[] => {
    return schedule.filter(cls => Array.isArray(cls.days) && cls.days.includes(day))
  }

  // Get class at specific time slot
  const getClassAtTime = (day: string, time: string): ScheduleClass | null => {
    const classes = getClassesForDay(day)
    for (const cls of classes) {
      const classStart = cls.start_time.replace(':', '')
      const classEnd = cls.end_time.replace(':', '')
      const slotTime = time.replace(':', '')
      
      if (slotTime >= classStart && slotTime < classEnd) {
        return cls
      }
    }
    return null
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            My Timetable
          </h1>
          <p className="text-muted-foreground text-lg">
            Your weekly class schedule
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Current Semester</span>
        </div>
      </div>

      {isError ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Unable to Load Timetable
            </h3>
            <p className="text-muted-foreground mb-4">
              {error?.message || 'Failed to fetch enrollment data'}
            </p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-4 text-muted-foreground">Loading timetable...</p>
          </CardContent>
        </Card>
      ) : schedule.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No Classes Scheduled
            </h3>
            <p className="text-muted-foreground mb-6">
              Enroll in courses to see your class schedule here
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Legend */}
          <div className="flex flex-wrap gap-3">
            {schedule.map((cls, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div className={cn("w-4 h-4 rounded", cls.color)}></div>
                <span className="font-medium">{cls.course_code}</span>
              </div>
            ))}
          </div>

          {/* Desktop Timetable View */}
          <div className="hidden lg:block">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="border border-border p-3 text-left font-semibold text-sm w-24">
                          Time
                        </th>
                        {daysOfWeek.slice(0, 5).map((day) => (
                          <th key={day} className="border border-border p-3 text-center font-semibold text-sm">
                            {day}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {timeSlots.map((time) => (
                        <tr key={time} className="hover:bg-muted/30 transition-colors">
                          <td className="border border-border p-3 text-sm font-medium text-muted-foreground">
                            {time}
                          </td>
                          {daysOfWeek.slice(0, 5).map((day) => {
                            const classAtTime = getClassAtTime(day, time)
                            return (
                              <td key={day} className="border border-border p-1">
                                {classAtTime && time === classAtTime.start_time && (
                                  <div className={cn(
                                    "p-3 rounded-lg text-white h-full",
                                    classAtTime.color
                                  )}>
                                    <div className="font-bold text-sm mb-1">
                                      {classAtTime.course_code}
                                    </div>
                                    <div className="text-xs opacity-90 mb-2">
                                      {classAtTime.course_title}
                                    </div>
                                    <div className="flex items-center gap-1 text-xs opacity-80">
                                      <Clock className="h-3 w-3" />
                                      <span>{classAtTime.start_time} - {classAtTime.end_time}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs opacity-80 mt-1">
                                      <MapPin className="h-3 w-3" />
                                      <span>{classAtTime.room_location}</span>
                                    </div>
                                  </div>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mobile List View */}
          <div className="lg:hidden space-y-4">
            {daysOfWeek.slice(0, 5).map((day) => {
              const classes = getClassesForDay(day)
              
              if (classes.length === 0) return null

              return (
                <Card key={day}>
                  <CardHeader>
                    <CardTitle className="text-lg">{day}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {classes.map((cls, index) => (
                      <div
                        key={index}
                        className={cn(
                          "p-4 rounded-lg text-white",
                          cls.color
                        )}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-bold text-lg">{cls.course_code}</div>
                          <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                            Section {cls.section_number}
                          </Badge>
                        </div>
                        <div className="text-sm opacity-90 mb-3">
                          {cls.course_title}
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 opacity-90">
                            <Clock className="h-4 w-4" />
                            <span>{cls.start_time} - {cls.end_time}</span>
                          </div>
                          <div className="flex items-center gap-2 opacity-90">
                            <MapPin className="h-4 w-4" />
                            <span>{cls.room_location}</span>
                          </div>
                          <div className="flex items-center gap-2 opacity-90">
                            <User className="h-4 w-4" />
                            <span>{cls.instructor_name}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{schedule.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Enrolled courses
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Weekly Hours</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {schedule.reduce((total, cls) => {
                    const hours = cls.days.length * 1.5 // Assuming 1.5 hours per class
                    return total + hours
                  }, 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Contact hours per week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Busiest Day</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {schedule.length === 0
                    ? 'N/A'
                    : daysOfWeek.reduce((max, day) => {
                        const count = getClassesForDay(day).length
                        return count > getClassesForDay(max).length ? day : max
                      }, daysOfWeek[0]).substring(0, 3)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Most classes scheduled
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
