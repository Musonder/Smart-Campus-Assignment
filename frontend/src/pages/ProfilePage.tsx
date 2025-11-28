/**
 * Profile Page
 * 
 * User profile management with personal information and academic details
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { User, Mail, Phone, MapPin, Calendar, GraduationCap, BookOpen, Award, Edit, Save, X } from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { authService } from '@/services/auth.service'
import { academicService } from '@/services/academic.service'
import { getInitials } from '@/lib/utils'

export function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false)
  const queryClient = useQueryClient()

  // Fetch current user
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => authService.getCurrentUser(),
  })

  // Fetch enrollments for academic info
  const { data: enrollments } = useQuery({
    queryKey: ['myEnrollments'],
    queryFn: () => academicService.getMyEnrollments(),
    enabled: !!user && user.user_type !== 'admin',
  })

  // Profile form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    bio: '',
  })

  // Update form when user data loads
  useState(() => {
    if (user) {
      setFormData({
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        phone: user.phone_number || '',
        address: user.address || '',
        bio: user.bio || '',
      })
    }
  })

  // Update profile mutation
  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // This would call an API endpoint - for now just simulate
      await new Promise(resolve => setTimeout(resolve, 1000))
      return data
    },
    onSuccess: () => {
      toast.success('Profile updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['currentUser'] })
      setIsEditing(false)
    },
    onError: () => {
      toast.error('Failed to update profile')
    },
  })

  const handleSave = () => {
    updateMutation.mutate(formData)
  }

  const handleCancel = () => {
    if (user) {
      setFormData({
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        phone: user.phone_number || '',
        address: user.address || '',
        bio: user.bio || '',
      })
    }
    setIsEditing(false)
  }

  // Calculate academic stats
  const totalCredits = enrollments?.reduce((sum, e) => sum + (e.credits || 0), 0) || 0
  const averageGrade = enrollments?.length
    ? enrollments.reduce((sum, e) => sum + (e.current_grade_percentage || 0), 0) / enrollments.length
    : 0

  if (userLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 w-32 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-32 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Unable to load profile</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Profile</h1>
          <p className="text-muted-foreground text-lg">
            Manage your personal information and view your academic progress
          </p>
        </div>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} className="gap-2">
            <Edit className="h-4 w-4" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
            <Button
              onClick={handleCancel}
              variant="outline"
              disabled={updateMutation.isPending}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Profile Overview */}
      <Card className="border-primary/20">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24 ring-4 ring-background shadow-xl">
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-3xl font-bold">
                {getInitials(user.first_name, user.last_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-3xl font-bold text-foreground">{user.full_name}</h2>
                <Badge variant="outline" className="text-sm">
                  {user.user_type.charAt(0).toUpperCase() + user.user_type.slice(1)}
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Student ID: {user.id.substring(0, 8)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Academic Statistics (for students) */}
      {user.user_type === 'student' && enrollments && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Enrollments</CardTitle>
              <BookOpen className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{enrollments.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Active courses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
              <GraduationCap className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">{totalCredits}</div>
              <p className="text-xs text-muted-foreground mt-1">Credits enrolled</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
              <Award className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-secondary">{averageGrade.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">Current semester</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Your basic contact and personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              {isEditing ? (
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Enter first name"
                />
              ) : (
                <div className="flex items-center gap-2 py-2 px-3 bg-muted/50 rounded-md">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{user.first_name}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              {isEditing ? (
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Enter last name"
                />
              ) : (
                <div className="flex items-center gap-2 py-2 px-3 bg-muted/50 rounded-md">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{user.last_name}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="flex items-center gap-2 py-2 px-3 bg-muted/50 rounded-md">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">{user.email}</span>
              </div>
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              {isEditing ? (
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              ) : (
                <div className="flex items-center gap-2 py-2 px-3 bg-muted/50 rounded-md">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{user.phone_number || 'Not provided'}</span>
                </div>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              {isEditing ? (
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter address"
                />
              ) : (
                <div className="flex items-center gap-2 py-2 px-3 bg-muted/50 rounded-md">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{user.address || 'Not provided'}</span>
                </div>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="bio">Bio</Label>
              {isEditing ? (
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  rows={4}
                />
              ) : (
                <div className="py-2 px-3 bg-muted/50 rounded-md min-h-[100px]">
                  <p className="text-foreground">{user.bio || 'No bio provided'}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your account details and status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">User ID</p>
              <p className="text-sm text-foreground font-mono">{user.id}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Account Type</p>
              <Badge variant="outline">
                {user.user_type.charAt(0).toUpperCase() + user.user_type.slice(1)}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Member Since</p>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Calendar className="h-4 w-4" />
                <span>{new Date(user.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Account Status</p>
              <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                Active
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Enrollments (for students) */}
      {user.user_type === 'student' && enrollments && enrollments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Current Enrollments</CardTitle>
            <CardDescription>Courses you're currently enrolled in</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {enrollments.filter(e => e.enrollment_status === 'enrolled').map((enrollment) => (
                <div
                  key={enrollment.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
                >
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">
                      {enrollment.course_code} - {enrollment.course_title}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Section {enrollment.section_number} • {enrollment.semester}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {enrollment.current_letter_grade && (
                      <Badge variant="outline" className="text-lg font-semibold px-4">
                        {enrollment.current_letter_grade}
                      </Badge>
                    )}
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">
                        {enrollment.current_grade_percentage.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">Current Grade</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your recent actions and updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4 pb-4 border-b border-border last:border-0 last:pb-0">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <BookOpen className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Profile viewed
                </p>
                <p className="text-xs text-muted-foreground">
                  Just now
                </p>
              </div>
            </div>
            {enrollments?.slice(0, 3).map((enrollment) => (
              <div
                key={enrollment.id}
                className="flex items-start gap-4 pb-4 border-b border-border last:border-0 last:pb-0"
              >
                <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="h-4 w-4 text-success" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    Enrolled in {enrollment.course_code}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(enrollment.enrolled_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

