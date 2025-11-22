/**
 * Dashboard Layout
 * 
 * Main layout with sidebar navigation and header
 */

import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  GraduationCap,
  Building2,
  BarChart3,
  Settings,
  Menu,
  X,
  Moon,
  Sun,
  LogOut,
  Users,
  FileText,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useTheme } from '@/components/theme-provider'
import { authService } from '@/services/auth.service'
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
  ]

  const lecturerNav = [
    { name: 'My Courses', href: '/lecturer/courses', icon: BookOpen, roles: ['lecturer'] },
    { name: 'Students', href: '/lecturer/students', icon: Users, roles: ['lecturer'] },
    { name: 'Grading', href: '/lecturer/grading', icon: ClipboardCheck, roles: ['lecturer'] },
    { name: 'Schedule', href: '/lecturer/schedule', icon: Calendar, roles: ['lecturer'] },
    { name: 'Reports', href: '/lecturer/reports', icon: FileText, roles: ['lecturer'] },
  ]

  const staffNav = [
    { name: 'Facilities', href: '/staff/facilities', icon: Building2, roles: ['staff'] },
    { name: 'Bookings', href: '/staff/bookings', icon: Calendar, roles: ['staff'] },
    { name: 'Maintenance', href: '/staff/maintenance', icon: Settings, roles: ['staff'] },
    { name: 'Reports', href: '/staff/reports', icon: FileText, roles: ['staff'] },
  ]

  const adminNav = [
    { name: 'Courses', href: '/admin/courses', icon: BookOpen, roles: ['admin'] },
    { name: 'Enrollments', href: '/admin/enrollments', icon: GraduationCap, roles: ['admin'] },
    { name: 'Facilities', href: '/admin/facilities', icon: Building2, roles: ['admin'] },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChart3, roles: ['admin'] },
    { name: 'Audit Logs', href: '/admin/audit', icon: FileText, roles: ['admin'] },
    { name: 'Settings', href: '/admin/settings', icon: Settings, roles: ['admin'] },
    { name: 'Users', href: '/admin/users', icon: Users, roles: ['admin'] },
  ]

  const allNav = [...baseNav, ...studentNav, ...lecturerNav, ...staffNav, ...adminNav]
  
  return allNav.filter(item => item.roles.includes(userType))
}

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()

  // Fetch current user - REAL API CALL
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => authService.getCurrentUser(),
  })

  // Get navigation items based on user role
  const navigation = user ? getNavigationForRole(user.user_type) : []

  const handleLogout = async () => {
    try {
      await authService.logout()
      toast.success('Logged out successfully')
      navigate('/login')
    } catch (error) {
      toast.error('Logout failed')
    }
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 transform bg-card border-r border-border transition-all duration-300 ease-in-out lg:translate-x-0",
          sidebarCollapsed ? "w-20" : "w-72",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo and close/collapse button */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-border">
          <div className={cn("flex items-center gap-3 transition-opacity", sidebarCollapsed && "opacity-0")}>
            <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center text-white font-bold text-xl">
              A
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-xl font-bold text-foreground">Argos</h1>
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
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  sidebarCollapsed && "justify-center"
                )}
                onClick={() => setSidebarOpen(false)}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!sidebarCollapsed && <span>{item.name}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User profile section */}
        <div className="border-t border-border p-4">
          {user && !sidebarCollapsed && (
            <div className="flex items-center gap-3 mb-3">
              <Avatar>
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials(user.first_name, user.last_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user.full_name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
                <p className="text-xs text-primary font-medium">
                  {user.user_type.charAt(0).toUpperCase() + user.user_type.slice(1)}
                </p>
              </div>
            </div>
          )}
          
          {user && sidebarCollapsed && (
            <div className="flex justify-center mb-3">
              <Avatar>
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials(user.first_name, user.last_name)}
                </AvatarFallback>
              </Avatar>
            </div>
          )}
          
          <div className={cn("flex gap-2", sidebarCollapsed && "flex-col")}>
            <Button
              variant="outline"
              size="sm"
              className={cn(sidebarCollapsed ? "w-full" : "flex-1")}
              onClick={toggleTheme}
              title={sidebarCollapsed ? (theme === 'dark' ? 'Light mode' : 'Dark mode') : undefined}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn(sidebarCollapsed ? "w-full" : "flex-1")}
              onClick={handleLogout}
              title={sidebarCollapsed ? 'Logout' : undefined}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={cn("transition-all duration-300", sidebarCollapsed ? "lg:pl-20" : "lg:pl-72")}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-full items-center gap-4 px-6">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="flex-1">
              {/* Breadcrumb or search can go here */}
            </div>

            {/* User menu for desktop */}
            <div className="hidden lg:flex items-center gap-3">
              {user && (
                <>
                  <span className="text-sm text-muted-foreground">
                    {user.user_type.charAt(0).toUpperCase() + user.user_type.slice(1)}
                  </span>
                  <Avatar>
                    <AvatarFallback className="bg-secondary text-secondary-foreground">
                      {getInitials(user.first_name, user.last_name)}
                    </AvatarFallback>
                  </Avatar>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}


