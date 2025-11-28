/**
 * Settings Page
 * 
 * User preferences, notifications, privacy, and account settings
 */

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { 
  Settings, 
  Bell, 
  Lock, 
  Shield, 
  Eye, 
  Mail, 
  Smartphone,
  Moon,
  Sun,
  Globe,
  Save,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/components/theme-provider'
import { authService } from '@/services/auth.service'

export function SettingsPage() {
  const { theme, setTheme } = useTheme()

  // Fetch current user
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => authService.getCurrentUser(),
  })

  // Notification settings state
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: false,
    smsNotifications: false,
    enrollmentAlerts: true,
    gradeUpdates: true,
    assignmentReminders: true,
    systemAnnouncements: true,
  })

  // Privacy settings state
  const [privacy, setPrivacy] = useState({
    profileVisibility: 'public',
    showEmail: false,
    showPhone: false,
    activityTracking: true,
  })

  // Security settings state
  const [security, setSecurity] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorEnabled: false,
  })

  // Save notification settings
  const saveNotificationsMutation = useMutation({
    mutationFn: async (data: typeof notifications) => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      return data
    },
    onSuccess: () => {
      toast.success('Notification preferences saved!')
    },
    onError: () => {
      toast.error('Failed to save notification preferences')
    },
  })

  // Save privacy settings
  const savePrivacyMutation = useMutation({
    mutationFn: async (data: typeof privacy) => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      return data
    },
    onSuccess: () => {
      toast.success('Privacy settings saved!')
    },
    onError: () => {
      toast.error('Failed to save privacy settings')
    },
  })

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      return data
    },
    onSuccess: () => {
      toast.success('Password changed successfully!')
      setSecurity({ ...security, currentPassword: '', newPassword: '', confirmPassword: '' })
    },
    onError: () => {
      toast.error('Failed to change password')
    },
  })

  const handleChangePassword = () => {
    if (security.newPassword !== security.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (security.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    changePasswordMutation.mutate({
      currentPassword: security.currentPassword,
      newPassword: security.newPassword,
    })
  }

  if (userLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <Card>
          <CardHeader>
            <div className="h-6 w-32 bg-muted rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Unable to load settings</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground text-lg">
          Manage your account preferences and settings
        </p>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                General Preferences
              </CardTitle>
              <CardDescription>
                Customize your experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Theme Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="theme" className="text-base font-semibold">
                      Appearance
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Choose your preferred theme
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={theme === 'light' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTheme('light')}
                      className="gap-2"
                    >
                      <Sun className="h-4 w-4" />
                      Light
                    </Button>
                    <Button
                      variant={theme === 'dark' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTheme('dark')}
                      className="gap-2"
                    >
                      <Moon className="h-4 w-4" />
                      Dark
                    </Button>
                  </div>
                </div>
              </div>

              {/* Language */}
              <div className="space-y-2">
                <Label htmlFor="language" className="text-base font-semibold">
                  Language
                </Label>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="outline">English (US)</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  More languages coming soon
                </p>
              </div>

              {/* Time Zone */}
              <div className="space-y-2">
                <Label htmlFor="timezone" className="text-base font-semibold">
                  Time Zone
                </Label>
                <Input
                  id="timezone"
                  value="(UTC-05:00) Eastern Time"
                  readOnly
                  className="bg-muted/50"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose how you want to be notified
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Notification Channels */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Notification Channels</h3>
                
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <Label className="font-medium">Email Notifications</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Receive updates via email
                    </p>
                  </div>
                  <Switch
                    checked={notifications.emailNotifications}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, emailNotifications: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-muted-foreground" />
                      <Label className="font-medium">Push Notifications</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Receive browser push notifications
                    </p>
                  </div>
                  <Switch
                    checked={notifications.pushNotifications}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, pushNotifications: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between py-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                      <Label className="font-medium">SMS Notifications</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Receive important updates via SMS
                    </p>
                  </div>
                  <Switch
                    checked={notifications.smsNotifications}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, smsNotifications: checked })
                    }
                  />
                </div>
              </div>

              {/* Notification Types */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Notification Types</h3>
                
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <Label className="font-medium">Enrollment Alerts</Label>
                  <Switch
                    checked={notifications.enrollmentAlerts}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, enrollmentAlerts: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between py-3 border-b border-border">
                  <Label className="font-medium">Grade Updates</Label>
                  <Switch
                    checked={notifications.gradeUpdates}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, gradeUpdates: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between py-3 border-b border-border">
                  <Label className="font-medium">Assignment Reminders</Label>
                  <Switch
                    checked={notifications.assignmentReminders}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, assignmentReminders: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between py-3">
                  <Label className="font-medium">System Announcements</Label>
                  <Switch
                    checked={notifications.systemAnnouncements}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, systemAnnouncements: checked })
                    }
                  />
                </div>
              </div>

              <Button
                onClick={() => saveNotificationsMutation.mutate(notifications)}
                disabled={saveNotificationsMutation.isPending}
                className="w-full gap-2"
              >
                <Save className="h-4 w-4" />
                Save Notification Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Settings */}
        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Privacy & Data
              </CardTitle>
              <CardDescription>
                Control your privacy and data preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div className="space-y-0.5">
                    <Label className="font-medium">Show Email on Profile</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow others to see your email address
                    </p>
                  </div>
                  <Switch
                    checked={privacy.showEmail}
                    onCheckedChange={(checked) =>
                      setPrivacy({ ...privacy, showEmail: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div className="space-y-0.5">
                    <Label className="font-medium">Show Phone Number</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow others to see your phone number
                    </p>
                  </div>
                  <Switch
                    checked={privacy.showPhone}
                    onCheckedChange={(checked) =>
                      setPrivacy({ ...privacy, showPhone: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between py-3">
                  <div className="space-y-0.5">
                    <Label className="font-medium">Activity Tracking</Label>
                    <p className="text-sm text-muted-foreground">
                      Help us improve your experience with usage analytics
                    </p>
                  </div>
                  <Switch
                    checked={privacy.activityTracking}
                    onCheckedChange={(checked) =>
                      setPrivacy({ ...privacy, activityTracking: checked })
                    }
                  />
                </div>
              </div>

              <Button
                onClick={() => savePrivacyMutation.mutate(privacy)}
                disabled={savePrivacyMutation.isPending}
                className="w-full gap-2"
              >
                <Save className="h-4 w-4" />
                Save Privacy Settings
              </Button>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Data Management
              </CardTitle>
              <CardDescription>
                Export or delete your data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Button variant="outline" className="w-full gap-2">
                  Download My Data
                </Button>
                <p className="text-xs text-muted-foreground">
                  Export all your personal data in a downloadable format
                </p>
              </div>

              <div className="space-y-2">
                <Button 
                  variant="destructive" 
                  className="w-full gap-2"
                  disabled={user?.user_type === 'admin'}
                  onClick={() => {
                    if (user?.user_type === 'admin') {
                      toast.error('Admins cannot delete their own accounts. Please contact another administrator.')
                      return
                    }
                    if (confirm('Are you sure you want to permanently delete your account? This action cannot be undone.')) {
                      toast.info('Account deletion feature coming soon')
                    }
                  }}
                >
                  <AlertCircle className="h-4 w-4" />
                  Delete My Account
                </Button>
                {user?.user_type === 'admin' ? (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Admin accounts cannot be self-deleted for security reasons
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Permanently delete your account and all associated data
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your account password
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={security.currentPassword}
                    onChange={(e) => setSecurity({ ...security, currentPassword: e.target.value })}
                    placeholder="Enter current password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={security.newPassword}
                    onChange={(e) => setSecurity({ ...security, newPassword: e.target.value })}
                    placeholder="Enter new password"
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 8 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={security.confirmPassword}
                    onChange={(e) => setSecurity({ ...security, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              <Button
                onClick={handleChangePassword}
                disabled={
                  changePasswordMutation.isPending ||
                  !security.currentPassword ||
                  !security.newPassword ||
                  !security.confirmPassword
                }
                className="w-full gap-2"
              >
                <Save className="h-4 w-4" />
                Change Password
              </Button>
            </CardContent>
          </Card>

          {/* Two-Factor Authentication */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>
                Add an extra layer of security to your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="font-medium">Enable 2FA</Label>
                  <p className="text-sm text-muted-foreground">
                    Require verification code when signing in
                  </p>
                </div>
                <Switch
                  checked={security.twoFactorEnabled}
                  onCheckedChange={(checked) =>
                    setSecurity({ ...security, twoFactorEnabled: checked })
                  }
                />
              </div>

              {security.twoFactorEnabled && (
                <div className="mt-6 p-4 bg-success/10 border border-success/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                    <div>
                      <p className="font-medium text-success">Two-Factor Authentication Enabled</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your account is protected with an additional layer of security
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Sessions */}
          <Card>
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>
                Manage your active login sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Current Session</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date().toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                    Active
                  </Badge>
                </div>
              </div>

              <Button variant="outline" className="w-full mt-4 gap-2">
                End All Other Sessions
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

