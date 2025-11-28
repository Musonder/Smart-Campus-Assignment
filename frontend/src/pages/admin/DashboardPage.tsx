/**
 * Administrator Dashboard
 * 
 * Comprehensive admin overview with system statistics, health monitoring,
 * and quick access to all admin functions.
 * 
 * Features aligned with assignment requirements:
 * - RBAC/ABAC user management
 * - System health monitoring
 * - Event sourcing status
 * - ML model status
 * - Audit log summary
 * - Policy engine status
 * - Plugin system status
 */

import { useQuery } from '@tanstack/react-query'
import { 
  Users, 
  BookOpen, 
  Building2, 
  Shield, 
  BarChart3, 
  FileText, 
  Activity,
  AlertCircle,
  CheckCircle2,
  Database,
  Cpu,
  Zap
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { authService } from '@/services/auth.service'
import apiClient from '@/lib/api-client'
import { getGreeting } from '@/lib/utils'
import { Link } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'

interface SystemStats {
  total_users: number
  active_users: number
  total_courses: number
  active_enrollments: number
  total_facilities: number
  active_bookings: number
  system_health: 'healthy' | 'degraded' | 'critical'
  services_online: number
  total_services: number
  event_store_events: number
  audit_logs_count: number
  ml_models_active: number
  plugins_loaded: number
}

interface RecentActivity {
  id: string
  type: string
  description: string
  timestamp: string
  user: string
  severity: 'info' | 'warning' | 'error' | 'success'
}

export function AdminDashboardPage() {
  // Fetch current user - REAL API ONLY
  const { data: user, isLoading: userLoading, isError: userError } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => authService.getCurrentUser(),
    retry: 2,
  })

  // Fetch system statistics - REAL API ONLY
  const { data: stats, isLoading: statsLoading, isError: statsError } = useQuery({
    queryKey: ['admin-system-stats'],
    queryFn: async () => {
      const response = await apiClient.get<SystemStats>('/api/v1/admin/stats')
      return response.data
    },
    retry: 2,
  })

  // Fetch recent activity - REAL API ONLY
  const { data: recentActivity, isLoading: activityLoading, isError: activityError } = useQuery({
    queryKey: ['admin-recent-activity'],
    queryFn: async () => {
      const response = await apiClient.get<RecentActivity[]>('/api/v1/admin/activity')
      return response.data || []
    },
    retry: 2,
  })

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy':
        return 'text-green-600'
      case 'degraded':
        return 'text-yellow-600'
      case 'critical':
        return 'text-red-600'
      default:
        return 'text-muted-foreground'
    }
  }

  const getHealthBadge = (health: string) => {
    switch (health) {
      case 'healthy':
        return <Badge variant="default" className="bg-green-600">Healthy</Badge>
      case 'degraded':
        return <Badge variant="warning">Degraded</Badge>
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const getActivityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />
    }
  }

  // Always render the dashboard, even if APIs fail
  // Always render dashboard, even if user fetch fails
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header - Always visible */}
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">
          {userLoading ? (
            'Loading...'
          ) : userError ? (
            'Administrator Dashboard'
          ) : (
            `${getGreeting()}, ${user?.first_name || 'Administrator'}!`
          )}
        </h1>
        <p className="text-muted-foreground text-lg">
          System Overview & Management Dashboard
        </p>
        {userError && (
          <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              ⚠️ Unable to load user information. Dashboard features may be limited.
            </p>
          </div>
        )}
      </div>

      {/* System Health Banner */}
      {statsError ? (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-destructive/10">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Unable to Load System Status</h3>
                  <p className="text-sm text-muted-foreground">
                    Failed to fetch system statistics from API
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : statsLoading ? (
        <Card className="border-border/60">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-36" />
                </div>
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
          </CardContent>
        </Card>
      ) : stats ? (
        <Card className={stats.system_health === 'critical' ? 'border-destructive' : stats.system_health === 'degraded' ? 'border-yellow-500' : 'border-green-500'}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${stats.system_health === 'critical' ? 'bg-destructive/10' : stats.system_health === 'degraded' ? 'bg-yellow-500/10' : 'bg-green-500/10'}`}>
                  <Activity className={`h-6 w-6 ${getHealthColor(stats.system_health)}`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">System Status</h3>
                  <p className="text-sm text-muted-foreground">
                    {stats.services_online} of {stats.total_services} services online
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {getHealthBadge(stats.system_health)}
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin/settings">View Details</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Key Statistics */}
      {statsLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-border/60">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-9 w-20 mb-2" />
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-8 w-full mt-3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : statsError ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Unable to Load Statistics
            </h3>
            <p className="text-muted-foreground mb-4">
              Failed to fetch system statistics from the API
            </p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      ) : stats ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.total_users}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.active_users} active now
              </p>
              <Button variant="ghost" size="sm" className="mt-2" asChild>
                <Link to="/admin/users">Manage Users →</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Courses & Enrollments</CardTitle>
              <BookOpen className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{stats.total_courses}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.active_enrollments} active enrollments
              </p>
              <Button variant="ghost" size="sm" className="mt-2" asChild>
                <Link to="/admin/courses">Manage Courses →</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Facilities</CardTitle>
              <Building2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.total_facilities}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.active_bookings} active bookings
              </p>
              <Button variant="ghost" size="sm" className="mt-2" asChild>
                <Link to="/admin/facilities">Manage Facilities →</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Security & Compliance</CardTitle>
              <Shield className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{stats.audit_logs_count}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Audit log entries
              </p>
              <Button variant="ghost" size="sm" className="mt-2" asChild>
                <Link to="/admin/security">Security Center →</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* System Components Status */}
      {statsLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-border/60">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-5 w-32" />
                </div>
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : statsError ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Unable to Load System Components
            </h3>
            <p className="text-muted-foreground mb-4">
              Failed to fetch system component status from the API
            </p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      ) : stats ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Event Sourcing
              </CardTitle>
              <CardDescription>Event store status and metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Events</span>
                  <span className="text-lg font-semibold">{stats.event_store_events}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant="default" className="bg-green-600">Operational</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                Machine Learning
              </CardTitle>
              <CardDescription>ML models and predictions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Active Models</span>
                  <span className="text-lg font-semibold">{stats.ml_models_active}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant="default" className="bg-green-600">Active</Badge>
                </div>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link to="/admin/analytics">View Analytics →</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Plugin System
              </CardTitle>
              <CardDescription>Hot-reloadable plugins</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Loaded Plugins</span>
                  <span className="text-lg font-semibold">{stats.plugins_loaded}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant="secondary">Ready</Badge>
                </div>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link to="/admin/settings">Manage Plugins →</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Waiting for System Data
            </h3>
            <p className="text-muted-foreground">
              System components information will appear here once available
            </p>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-auto flex-col py-4" asChild>
              <Link to="/admin/users">
                <Users className="h-6 w-6 mb-2" />
                <span>User Management</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-4" asChild>
              <Link to="/admin/analytics">
                <BarChart3 className="h-6 w-6 mb-2" />
                <span>Analytics</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-4" asChild>
              <Link to="/admin/audit">
                <FileText className="h-6 w-6 mb-2" />
                <span>Audit Logs</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-4" asChild>
              <Link to="/admin/security">
                <Shield className="h-6 w-6 mb-2" />
                <span>Security</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent System Activity</CardTitle>
          <CardDescription>Latest events and operations</CardDescription>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg border border-border">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : activityError ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Unable to Load Activity
              </h3>
              <p className="text-muted-foreground mb-4">
                Failed to fetch recent activity from the API
              </p>
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
          ) : recentActivity && recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.slice(0, 10).map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  {getActivityIcon(activity.severity)}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.user} • {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {activity.type}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No recent activity</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

