/**
 * Login Page
 * 
 * Professional login interface with real authentication
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
import { authService } from '@/services/auth.service'
import { getErrorMessage } from '@/lib/api-client'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState<'student' | 'lecturer' | 'staff' | 'admin' | ''>('')
  const [showPassword, setShowPassword] = useState(false)

  // Login mutation - REAL API CALL
  const loginMutation = useMutation({
    mutationFn: () => authService.login({ email, password }),
    onSuccess: async () => {
      // Verify user role matches selected role (if role was selected)
      if (selectedRole) {
        try {
          const user = await authService.getCurrentUser()
          if (user.user_type !== selectedRole) {
            toast.warning(`You logged in as ${user.user_type}, but selected ${selectedRole}. Redirecting to your dashboard.`)
          } else {
            toast.success(`Welcome back, ${user.user_type}!`)
          }
        } catch (error) {
          // If we can't fetch user, just proceed
          toast.success('Welcome back!')
        }
      } else {
        toast.success('Welcome back!')
      }
      navigate('/dashboard')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loginMutation.mutate()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-white shadow-lg mb-4 overflow-hidden">
            <img src="/ZUT LOGO.png" alt="Argos Logo" className="h-12 w-12 object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Argos</h1>
          <p className="text-white/90">Smart Campus Orchestration Platform</p>
        </div>

        {/* Login Card */}
        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Welcome Back</CardTitle>
              <CardDescription>
                Sign in to your account to continue
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Role Selector */}
              <div className="space-y-2">
                <Label htmlFor="user_type">I am a...</Label>
                <Select
                  value={selectedRole}
                  onValueChange={(value) => setSelectedRole(value as any)}
                  disabled={loginMutation.isPending}
                >
                  <SelectTrigger id="user_type">
                    <SelectValue placeholder="Select your role (optional)" />
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
                <p className="text-xs text-muted-foreground">
                  Optional: Select your role for a personalized login experience
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={
                    selectedRole === 'student' ? 'student@university.edu' :
                    selectedRole === 'lecturer' ? 'lecturer@university.edu' :
                    selectedRole === 'staff' ? 'staff@university.edu' :
                    selectedRole === 'admin' ? 'admin@university.edu' :
                    'your.email@university.edu'
                  }
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loginMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-primary hover:underline"
                    tabIndex={-1}
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loginMutation.isPending}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={loginMutation.isPending}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                Don't have an account?{' '}
                <Link
                  to="/register"
                  className="text-primary hover:underline font-medium"
                >
                  Register here
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>

        {/* Footer */}
        <p className="text-center mt-8 text-sm text-white/80">
          © 2024 Argos. Research-Grade Smart Campus Platform
        </p>
      </div>
    </div>
  )
}

