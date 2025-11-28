/**
 * Registration Page
 * 
 * User registration with real API integration
 */

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GraduationCap, Loader2, Building2, Shield, BookOpen, Eye, EyeOff } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { authService, RegisterRequest } from '@/services/auth.service'
import { getErrorMessage } from '@/lib/api-client'

// Department and Major Course mapping
const DEPARTMENTS_AND_MAJORS = {
  'Computer Science': ['Software Engineering', 'Data Science', 'Artificial Intelligence', 'Cybersecurity', 'Computer Networks'],
  'Engineering': ['Mechanical Engineering', 'Electrical Engineering', 'Civil Engineering', 'Chemical Engineering', 'Aerospace Engineering'],
  'Business Administration': ['Accounting', 'Finance', 'Marketing', 'Human Resources', 'International Business'],
  'Natural Sciences': ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'Environmental Science'],
  'Medicine': ['General Medicine', 'Nursing', 'Pharmacy', 'Medical Laboratory Science', 'Public Health'],
  'Arts & Humanities': ['English Literature', 'History', 'Philosophy', 'Fine Arts', 'Music'],
  'Social Sciences': ['Psychology', 'Sociology', 'Political Science', 'Economics', 'Anthropology'],
  'Law': ['Corporate Law', 'Criminal Law', 'International Law', 'Constitutional Law', 'Environmental Law'],
}

export function RegisterPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<RegisterRequest>({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    user_type: 'student',
    student_id: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState<string>('')

  // Register mutation - REAL API CALL
  const registerMutation = useMutation({
    mutationFn: () => authService.register(formData),
    onSuccess: () => {
      toast.success('Account created successfully! Please sign in to continue.')
      navigate('/login')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    registerMutation.mutate()
  }

  const updateField = (field: keyof RegisterRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-white shadow-lg mb-4 overflow-hidden">
            <img src="/ZUT LOGO.png" alt="Argos Logo" className="h-12 w-12 object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Join Argos</h1>
          <p className="text-white/90">Create your smart campus account</p>
        </div>

        {/* Register Card */}
        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Create Account</CardTitle>
              <CardDescription>
                Fill in your details to get started
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    placeholder="John"
                    value={formData.first_name}
                    onChange={(e) => updateField('first_name', e.target.value)}
                    required
                    disabled={registerMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    placeholder="Doe"
                    value={formData.last_name}
                    onChange={(e) => updateField('last_name', e.target.value)}
                    required
                    disabled={registerMutation.isPending}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john.doe@university.edu"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  required
                  disabled={registerMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    required
                    minLength={8}
                    disabled={registerMutation.isPending}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={registerMutation.isPending}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Minimum 8 characters
                </p>
              </div>

              {/* Role Selector */}
              <div className="space-y-2">
                <Label htmlFor="user_type">I am a...</Label>
                <Select
                  value={formData.user_type}
                  onValueChange={(value) => updateField('user_type', value as any)}
                  disabled={registerMutation.isPending}
                >
                  <SelectTrigger id="user_type">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        <span>Student</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="lecturer">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        <span>Lecturer</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="staff">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <span>Staff</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        <span>Administrator</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Conditional Fields Based on Role */}
              {formData.user_type === 'student' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="student_id">Student ID</Label>
                    <Input
                      id="student_id"
                      placeholder="STU001234"
                      value={formData.student_id || ''}
                      onChange={(e) => updateField('student_id', e.target.value)}
                      required
                      disabled={registerMutation.isPending}
                    />
                  </div>
                  
                  {/* Department Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="department">Department (Optional)</Label>
                    <Select
                      value={selectedDepartment}
                      onValueChange={(value) => {
                        setSelectedDepartment(value)
                        // Reset major when department changes
                        updateField('major', '')
                      }}
                      disabled={registerMutation.isPending}
                    >
                      <SelectTrigger id="department">
                        <SelectValue placeholder="Select your department" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(DEPARTMENTS_AND_MAJORS).map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Major Course Selection - Only shows when department is selected */}
                  {selectedDepartment && (
                    <div className="space-y-2">
                      <Label htmlFor="major">Major Course</Label>
                      <Select
                        value={formData.major || ''}
                        onValueChange={(value) => updateField('major', value)}
                        disabled={registerMutation.isPending}
                      >
                        <SelectTrigger id="major">
                          <SelectValue placeholder="Select your major course" />
                        </SelectTrigger>
                        <SelectContent>
                          {DEPARTMENTS_AND_MAJORS[selectedDepartment as keyof typeof DEPARTMENTS_AND_MAJORS].map((major) => (
                            <SelectItem key={major} value={major}>
                              {major}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}

              {(formData.user_type === 'lecturer' || formData.user_type === 'staff' || formData.user_type === 'admin') && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="employee_id">Employee ID</Label>
                    <Input
                      id="employee_id"
                      placeholder={
                        formData.user_type === 'lecturer' ? 'LEC001' :
                        formData.user_type === 'staff' ? 'STF001' :
                        'ADM001'
                      }
                      value={formData.employee_id || ''}
                      onChange={(e) => updateField('employee_id', e.target.value)}
                      required
                      disabled={registerMutation.isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      placeholder="Computer Science"
                      value={formData.department || ''}
                      onChange={(e) => updateField('department', e.target.value)}
                      required
                      disabled={registerMutation.isPending}
                    />
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button
                type="submit"
                className="w-full"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="text-primary hover:underline font-medium"
                >
                  Sign in here
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}

