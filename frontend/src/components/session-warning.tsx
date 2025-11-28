/**
 * Session Expiration Warning Component
 * 
 * Shows a warning when session is about to expire
 */

import { useEffect, useState } from 'react'
import { AlertCircle, Clock, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { sessionService } from '@/services/session.service'
import { authService } from '@/services/auth.service'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

interface SessionWarningProps {
  userType: string
  minutesLeft: number
  onExtend: () => void
  onDismiss?: () => void
}

export function SessionWarning({ userType, minutesLeft, onExtend, onDismiss }: SessionWarningProps) {
  const [open, setOpen] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const navigate = useNavigate()

  const handleExtend = async () => {
    setIsRefreshing(true)
    try {
      const success = await sessionService.refreshAccessToken()
      if (success) {
        toast.success('Session extended successfully')
        onExtend()
        setOpen(false)
      } else {
        toast.error('Failed to extend session')
      }
    } catch (error) {
      toast.error('Failed to extend session')
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleLogout = async () => {
    await authService.logout()
    navigate('/login')
    toast.info('Session expired. Please log in again.')
  }

  const handleDismiss = () => {
    setOpen(false)
    if (onDismiss) {
      onDismiss()
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-2">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <AlertDialogTitle>Session Expiring Soon</AlertDialogTitle>
              <AlertDialogDescription className="mt-1">
                Your session will expire in {minutesLeft} {minutesLeft === 1 ? 'minute' : 'minutes'}.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            To continue working, please extend your session. Otherwise, you'll be logged out automatically.
          </p>
        </div>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={handleDismiss}>Dismiss</AlertDialogCancel>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="sm:flex-1"
          >
            Logout Now
          </Button>
          <AlertDialogAction
            onClick={handleExtend}
            disabled={isRefreshing}
            className="sm:flex-1"
          >
            {isRefreshing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Extending...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Extend Session
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

