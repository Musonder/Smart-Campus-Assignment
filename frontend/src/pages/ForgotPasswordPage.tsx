/**
 * Forgot Password Page
 * 
 * Allows users to request a password reset link
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Mail, CheckCircle2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import apiClient, { getErrorMessage } from '@/lib/api-client'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)

  // Forgot password mutation
  const forgotPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiClient.post('/auth/forgot-password', { email })
      return response.data
    },
    onSuccess: () => {
      setEmailSent(true)
      toast.success('Password reset email sent! Check your inbox.')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    forgotPasswordMutation.mutate(email)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-white shadow-lg mb-4 overflow-hidden">
            <img src="/ZUT LOGO.png" alt="Argos Logo" className="h-12 w-12 object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Forgot Password</h1>
          <p className="text-white/90">We'll send you a reset link</p>
        </div>

        {/* Forgot Password Card */}
        <Card>
          {!emailSent ? (
            <form onSubmit={handleSubmit}>
              <CardHeader>
                <CardTitle>Reset Your Password</CardTitle>
                <CardDescription>
                  Enter your email address and we'll send you a link to reset your password
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@university.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={forgotPasswordMutation.isPending}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter the email address associated with your account
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={forgotPasswordMutation.isPending}
                >
                  {forgotPasswordMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending reset link...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      Send Reset Link
                    </>
                  )}
                </Button>
                <Link
                  to="/login"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Login
                </Link>
              </CardFooter>
            </form>
          ) : (
            <>
              <CardHeader>
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-500" />
                </div>
                <CardTitle className="text-center">Check Your Email</CardTitle>
                <CardDescription className="text-center">
                  We've sent a password reset link to
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-center font-medium text-foreground">
                  {email}
                </p>
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <p className="text-sm text-muted-foreground">
                    <strong>Next steps:</strong>
                  </p>
                  <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                    <li>Check your email inbox</li>
                    <li>Click the password reset link</li>
                    <li>Create a new password</li>
                    <li>Sign in with your new password</li>
                  </ol>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  Didn't receive the email? Check your spam folder or{' '}
                  <button
                    onClick={() => {
                      setEmailSent(false)
                      forgotPasswordMutation.reset()
                    }}
                    className="text-primary hover:underline font-medium"
                  >
                    try again
                  </button>
                </p>
              </CardContent>
              <CardFooter>
                <Link
                  to="/login"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Login
                </Link>
              </CardFooter>
            </>
          )}
        </Card>

        {/* Footer */}
        <p className="text-center mt-8 text-sm text-white/80">
          © 2025 Argos. Research-Grade Smart Campus Platform
        </p>
      </div>
    </div>
  )
}

