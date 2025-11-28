/**
 * Dashboard Layout
 * 
 * Main layout with sidebar navigation and header
 */

import { useState, useEffect, useRef } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  GraduationCap,
  Building2,
  BarChart3,
  Settings as SettingsIcon,
  Menu,
  X,
  Moon,
  Sun,
  LogOut,
  Users,
  FileText,
  ClipboardCheck,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Clock,
  UserCircle,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from '@/components/theme-provider'
import { authService } from '@/services/auth.service'
import { sessionService } from '@/services/session.service'
import { SessionWarning } from '@/components/session-warning'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, getInitials } from '@/lib/utils'

// Role-based navigation items
const getNavigationForRole = (userType: string) => {
  const baseNav = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['student', 'lecturer', 'staff', 'admin'] },
  ]

  const studentNav = [
    { name: 'Courses', href: '/courses', icon: BookOpen, roles: ['student'] },
    { name: 'My Enrollments', href: '/enrollments', icon: GraduationCap, roles: ['student'] },
    { name: 'Timetable', href: '/timetable', icon: Calendar, roles: ['student'] },
    { name: 'Facilities', href: '/facilities', icon: Building2, roles: ['student'] },
    { name: 'Assignments', href: '/assignments', icon: ClipboardList, roles: ['student'] },
  ]

  const lecturerNav = [
    { name: 'My Courses', href: '/lecturer/courses', icon: BookOpen, roles: ['lecturer'] },
    { name: 'Assignments', href: '/lecturer/assignments', icon: ClipboardList, roles: ['lecturer'] },
    { name: 'Students', href: '/lecturer/students', icon: Users, roles: ['lecturer'] },
    { name: 'Grading', href: '/lecturer/grading', icon: ClipboardCheck, roles: ['lecturer'] },
    { name: 'Schedule', href: '/lecturer/schedule', icon: Calendar, roles: ['lecturer'] },
    { name: 'Reports', href: '/lecturer/reports', icon: FileText, roles: ['lecturer'] },
  ]

  const staffNav = [
    { name: 'Facilities', href: '/staff/facilities', icon: Building2, roles: ['staff'] },
    { name: 'Bookings', href: '/staff/bookings', icon: Calendar, roles: ['staff'] },
    { name: 'Maintenance', href: '/staff/maintenance', icon: SettingsIcon, roles: ['staff'] },
    { name: 'Reports', href: '/staff/reports', icon: FileText, roles: ['staff'] },
  ]

  const adminNav = [
    { name: 'Courses', href: '/admin/courses', icon: BookOpen, roles: ['admin'] },
    { name: 'Enrollments', href: '/admin/enrollments', icon: GraduationCap, roles: ['admin'] },
    { name: 'Facilities', href: '/admin/facilities', icon: Building2, roles: ['admin'] },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChart3, roles: ['admin'] },
    { name: 'Audit Logs', href: '/admin/audit', icon: FileText, roles: ['admin'] },
    { name: 'Settings', href: '/admin/settings', icon: SettingsIcon, roles: ['admin'] },
    { name: 'Users', href: '/admin/users', icon: Users, roles: ['admin'] },
  ]

  const allNav = [...baseNav, ...studentNav, ...lecturerNav, ...staffNav, ...adminNav]
  
  return allNav.filter(item => item.roles.includes(userType))
}

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sessionWarning, setSessionWarning] = useState<{ minutesLeft: number } | null>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const prevPathRef = useRef(location.pathname)

  // Fetch current user - REAL API CALL
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => authService.getCurrentUser(),
  })

  // Get navigation items based on user role
  const navigation = user ? getNavigationForRole(user.user_type) : []

  // Session management
  useEffect(() => {
    if (!user) return

    const handleExpiryWarning = (minutesLeft: number) => {
      setSessionWarning({ minutesLeft })
    }

    const handleSessionExpired = () => {
      toast.error('Your session has expired. Please log in again.')
      authService.logout()
      navigate('/login')
    }

    // Start session monitoring
    sessionService.startSessionMonitoring(
      user.user_type,
      handleExpiryWarning,
      handleSessionExpired
    )

    // Cleanup on unmount
    return () => {
      sessionService.stopSessionMonitoring()
    }
  }, [user, navigate])

  // Page transition animation
  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname
    }
  }, [location.pathname])

  const handleLogout = async () => {
    try {
      sessionService.stopSessionMonitoring()
      await authService.logout()
      toast.success('Logged out successfully')
      navigate('/login')
    } catch (error) {
      toast.error('Logout failed')
    }
  }

  const handleSessionExtended = () => {
    setSessionWarning(null)
  }

  // Get session status for display
  const sessionStatus = user ? sessionService.getSessionStatus(user.user_type) : null

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Session Warning */}
      {sessionWarning && user && (
        <SessionWarning
          userType={user.user_type}
          minutesLeft={sessionWarning.minutesLeft}
          onExtend={handleSessionExtended}
          onDismiss={() => setSessionWarning(null)}
        />
      )}

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-sm animate-in fade-in-0"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col transform bg-card/95 backdrop-blur-sm border-r border-border transition-all duration-300 ease-in-out lg:translate-x-0",
          sidebarCollapsed ? "w-20" : "w-72",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          "shadow-lg lg:shadow-none"
        )}
      >
        {/* Logo and close/collapse button */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-border">
          <div className={cn(
            "flex items-center gap-3 transition-all duration-300",
            sidebarCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
          )}>
            <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center shadow-lg transform transition-transform hover:scale-105 overflow-hidden">
              <img src="/ZUT LOGO.png" alt="Argos Logo" className="h-8 w-8 object-contain" />
            </div>
            {!sidebarCollapsed && (
              <div className="animate-in fade-in slide-in-from-left-2">
                <h1 className="text-xl font-bold text-foreground bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                  Argos
                </h1>
                <p className="text-xs text-muted-foreground">Smart Campus</p>
              </div>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {userLoading ? (
            <div className="space-y-2 px-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5">
                  <div className="h-5 w-5 rounded bg-muted animate-pulse" />
                  {!sidebarCollapsed && <div className="h-4 w-24 rounded bg-muted animate-pulse" />}
                </div>
              ))}
            </div>
          ) : (
            navigation.map((item) => {
            const isActive = location.pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 relative",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                  sidebarCollapsed && "justify-center"
                )}
                onClick={() => setSidebarOpen(false)}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <Icon className={cn(
                  "h-5 w-5 flex-shrink-0 transition-transform duration-200",
                  isActive ? "scale-110" : "group-hover:scale-105"
                )} />
                {!sidebarCollapsed && (
                  <span className={cn(
                    "transition-all duration-200",
                    isActive && "font-semibold"
                  )}>
                    {item.name}
                  </span>
                )}
                {isActive && !sidebarCollapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-primary-foreground/50 animate-in slide-in-from-left-1" />
                )}
              </Link>
            )
          }))}
        </nav>

        {/* Sidebar Footer */}
        <div className="mt-auto border-t border-border p-4">
          <p className="text-xs text-center text-muted-foreground">
            Argos Smart Campus © 2025
          </p>
        </div>
      </aside>

      {/* Main content */}
      <div className={cn("transition-all duration-300", sidebarCollapsed ? "lg:pl-20" : "lg:pl-72")}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 shadow-sm">
          <div className="flex h-full items-center gap-4 px-6">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden transition-transform hover:scale-105"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="flex-1">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {navigation.find(nav => nav.href === location.pathname)?.name || 'Dashboard'}
                </span>
              </div>
            </div>

            {/* Right side navbar - Session Timer, Theme Toggle, Avatar Card */}
            <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3">
              {userLoading ? (
                <>
                  <Skeleton className="h-9 w-14 sm:w-16 lg:w-20 rounded-lg" />
                  <Skeleton className="h-9 w-9 lg:h-10 lg:w-10 rounded-lg" />
                  <Skeleton className="h-9 w-9 sm:w-32 lg:w-48 rounded-lg" />
                </>
              ) : user ? (
                <>
                  {/* Session Timer */}
                  {sessionStatus && sessionStatus.isValid && (
                    <Card className={cn(
                      "px-1.5 sm:px-2 lg:px-3 py-1.5 sm:py-2 transition-all",
                      sessionStatus.isExpiringSoon ? "border-destructive/50 bg-destructive/5" : "border-border"
                    )}>
                      <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2">
                        <Clock className={cn(
                          "h-3 w-3 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4",
                          sessionStatus.isExpiringSoon ? "text-destructive animate-pulse" : "text-muted-foreground"
                        )} />
                        <span className={cn(
                          "text-[10px] sm:text-xs font-medium whitespace-nowrap",
                          sessionStatus.isExpiringSoon ? "text-destructive" : "text-muted-foreground"
                        )}>
                          {sessionStatus.minutesLeft}m
                        </span>
                      </div>
                    </Card>
                  )}

                  {/* Theme Toggle Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 lg:h-10 lg:w-10 transition-all hover:scale-105"
                      >
                        {theme === 'dark' ? (
                          <Moon className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
                        ) : (
                          <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem 
                        onClick={() => setTheme('light')}
                        className="cursor-pointer"
                      >
                        <Sun className="mr-2 h-4 w-4" />
                        <span>Light</span>
                        {theme === 'light' && <span className="ml-auto">✓</span>}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setTheme('dark')}
                        className="cursor-pointer"
                      >
                        <Moon className="mr-2 h-4 w-4" />
                        <span>Dark</span>
                        {theme === 'dark' && <span className="ml-auto">✓</span>}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setTheme('system')}
                        className="cursor-pointer"
                      >
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>System</span>
                        {theme === 'system' && <span className="ml-auto">✓</span>}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Avatar Card with Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Card className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50 p-1.5 lg:p-2 pr-2 lg:pr-4">
                        <div className="flex items-center gap-2 lg:gap-3">
                          <Avatar className="ring-2 ring-primary/20 h-7 w-7 sm:h-8 sm:w-8 lg:h-9 lg:w-9">
                            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-[10px] sm:text-xs lg:text-sm">
                              {getInitials(user.first_name, user.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="hidden sm:flex flex-col min-w-0 max-w-[100px] lg:max-w-none">
                            <p className="text-xs lg:text-sm font-semibold text-foreground truncate leading-tight">
                              {user.full_name}
                            </p>
                            <p className="text-[10px] lg:text-xs text-muted-foreground truncate leading-tight hidden lg:block">
                              {user.email}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[9px] lg:text-[10px] px-1 lg:px-1.5 py-0.5 h-fit hidden lg:block">
                            {user.user_type.charAt(0).toUpperCase() + user.user_type.slice(1)}
                          </Badge>
                        </div>
                      </Card>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1.5">
                          <p className="text-sm font-medium leading-none">{user.full_name}</p>
                          <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-fit w-fit">
                            {user.user_type.charAt(0).toUpperCase() + user.user_type.slice(1)}
                          </Badge>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                        <UserCircle className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
                        <SettingsIcon className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </DropdownMenuItem>
                      {user.user_type === 'student' && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => navigate('/enrollments')} className="cursor-pointer">
                            <GraduationCap className="mr-2 h-4 w-4" />
                            <span>My Enrollments</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate('/assignments')} className="cursor-pointer">
                            <ClipboardList className="mr-2 h-4 w-4" />
                            <span>Assignments</span>
                          </DropdownMenuItem>
                        </>
                      )}
                      {user.user_type === 'lecturer' && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => navigate('/lecturer/courses')} className="cursor-pointer">
                            <BookOpen className="mr-2 h-4 w-4" />
                            <span>My Courses</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate('/lecturer/grading')} className="cursor-pointer">
                            <ClipboardCheck className="mr-2 h-4 w-4" />
                            <span>Grading</span>
                          </DropdownMenuItem>
                        </>
                      )}
                      {user.user_type === 'admin' && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => navigate('/admin/users')} className="cursor-pointer">
                            <Users className="mr-2 h-4 w-4" />
                            <span>Manage Users</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate('/admin/analytics')} className="cursor-pointer">
                            <BarChart3 className="mr-2 h-4 w-4" />
                            <span>Analytics</span>
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Logout</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : null}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6 animate-in fade-in-10 slide-in-from-bottom-2 duration-300">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}


