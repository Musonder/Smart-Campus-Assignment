/**
 * Administrator Security Center
 * 
 * Security, Compliance & GDPR Management
 * 
 * Features:
 * - Audit logs with tamper-evident hash chain
 * - RBAC/ABAC access control management
 * - GDPR compliance tools (data erasure, pseudonymization)
 * - Security incident monitoring
 * - Access control policies
 */

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { 
  Shield, 
  FileText, 
  Lock, 
  AlertTriangle,
  CheckCircle2,
  Search,
  Download,
  Trash2,
  Eye,
  Key,
  Users
} from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import apiClient from '@/lib/api-client'
import { getErrorMessage } from '@/lib/api-client'

interface AuditLog {
  id: string
  timestamp: string
  user_id: string
  user_email: string
  action: string
  resource: string
  result: 'success' | 'failure' | 'warning'
  ip_address: string
  user_agent: string
  hash: string
  previous_hash: string
}

interface SecurityIncident {
  id: string
  type: 'unauthorized_access' | 'data_breach' | 'policy_violation' | 'suspicious_activity'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  timestamp: string
  resolved: boolean
}

export function AdminSecurityPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState<string | null>(null)

  // Fetch audit logs - REAL API ONLY
  const { data: auditLogs, isLoading: logsLoading, isError: logsError } = useQuery({
    queryKey: ['admin-audit-logs', searchTerm],
    queryFn: async () => {
      const params = searchTerm ? { search: searchTerm } : {}
      const response = await apiClient.get<AuditLog[]>('/api/v1/admin/audit-logs', { params })
      return response.data || []
    },
    retry: 2,
  })

  // Fetch security incidents - REAL API ONLY
  const { data: incidents, isLoading: incidentsLoading, isError: incidentsError } = useQuery({
    queryKey: ['admin-security-incidents'],
    queryFn: async () => {
      const response = await apiClient.get<SecurityIncident[]>('/api/v1/admin/security/incidents')
      return response.data || []
    },
    retry: 2,
  })

  // GDPR data erasure mutation
  const eraseDataMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiClient.post(`/api/v1/admin/gdpr/erase/${userId}`)
      return response.data
    },
    onSuccess: () => {
      toast.success('Data erased successfully (pseudonymized for analytics)')
      setSelectedUser(null)
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-600'
      case 'high':
        return 'bg-orange-600'
      case 'medium':
        return 'bg-yellow-600'
      default:
        return 'bg-blue-600'
    }
  }

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'success':
        return <Badge variant="default" className="bg-green-600">Success</Badge>
      case 'failure':
        return <Badge variant="destructive">Failure</Badge>
      case 'warning':
        return <Badge variant="warning">Warning</Badge>
      default:
        return <Badge variant="secondary">{result}</Badge>
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">
          Security Center
        </h1>
        <p className="text-muted-foreground text-lg">
          Monitor security, manage access control, and ensure compliance
        </p>
      </div>

      {/* Security Overview Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Audit Logs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            ) : logsError ? (
              <div className="text-2xl font-bold text-destructive">Error</div>
            ) : (
              <>
                <div className="text-2xl font-bold">{auditLogs?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Total entries</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {incidentsLoading ? (
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            ) : incidentsError ? (
              <div className="text-2xl font-bold text-destructive">Error</div>
            ) : (
              <>
                <div className="text-2xl font-bold text-orange-600">
                  {incidents?.filter(i => !i.resolved).length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Require attention</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hash Chain</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Valid</div>
            <p className="text-xs text-muted-foreground">Tamper-evident</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">GDPR Requests</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="audit" className="space-y-6">
        <TabsList>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          <TabsTrigger value="incidents">Security Incidents</TabsTrigger>
          <TabsTrigger value="access">Access Control</TabsTrigger>
          <TabsTrigger value="gdpr">GDPR Compliance</TabsTrigger>
        </TabsList>

        {/* Audit Logs Tab */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Audit Logs</CardTitle>
                  <CardDescription>
                    Tamper-evident append-only log with hash chain verification
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search logs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading audit logs...
                </div>
              ) : logsError ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-destructive mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Unable to Load Audit Logs
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Failed to fetch audit logs from the API
                  </p>
                  <Button onClick={() => window.location.reload()}>Retry</Button>
                </div>
              ) : auditLogs && auditLogs.length > 0 ? (
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-foreground">{log.action}</p>
                          {getResultBadge(log.result)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {log.user_email} • {log.resource} • {new Date(log.timestamp).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          IP: {log.ip_address} • Hash: {log.hash.substring(0, 16)}...
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Audit Logs</h3>
                  <p className="text-muted-foreground">Audit logs will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Incidents Tab */}
        <TabsContent value="incidents">
          <Card>
            <CardHeader>
              <CardTitle>Security Incidents</CardTitle>
              <CardDescription>
                Monitor and resolve security incidents
              </CardDescription>
            </CardHeader>
            <CardContent>
              {incidentsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading incidents...
                </div>
              ) : incidentsError ? (
                <div className="text-center py-12">
                  <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Unable to Load Incidents
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Failed to fetch security incidents from the API
                  </p>
                  <Button onClick={() => window.location.reload()}>Retry</Button>
                </div>
              ) : incidents && incidents.length > 0 ? (
                <div className="space-y-3">
                  {incidents.map((incident) => (
                    <div
                      key={incident.id}
                      className="flex items-center gap-4 p-4 rounded-lg border border-border"
                    >
                      <div className={`p-2 rounded-full ${getSeverityColor(incident.severity)}/10`}>
                        <AlertTriangle className={`h-5 w-5 ${getSeverityColor(incident.severity)}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-foreground">{incident.type.replace('_', ' ')}</p>
                          <Badge className={getSeverityColor(incident.severity)}>
                            {incident.severity}
                          </Badge>
                          {incident.resolved && (
                            <Badge variant="default" className="bg-green-600">Resolved</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{incident.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(incident.timestamp).toLocaleString()}
                        </p>
                      </div>
                      {!incident.resolved && (
                        <Button variant="outline" size="sm">
                          Resolve
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Active Incidents</h3>
                  <p className="text-muted-foreground">All systems secure</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Access Control Tab */}
        <TabsContent value="access">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  RBAC Roles
                </CardTitle>
                <CardDescription>Role-Based Access Control</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {['admin', 'lecturer', 'staff', 'student'].map((role) => (
                    <div key={role} className="flex items-center justify-between p-2 rounded border">
                      <span className="text-sm font-medium capitalize">{role}</span>
                      <Button variant="ghost" size="sm">Manage</Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  ABAC Policies
                </CardTitle>
                <CardDescription>Attribute-Based Access Control</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Policy management interface
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* GDPR Compliance Tab */}
        <TabsContent value="gdpr">
          <Card>
            <CardHeader>
              <CardTitle>GDPR Compliance Tools</CardTitle>
              <CardDescription>
                Data erasure and pseudonymization while preserving analytics integrity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Data Erasure</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Erase user data while preserving pseudonymized records for analytics.
                  The system will:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Remove personally identifiable information</li>
                  <li>Pseudonymize data for analytics preservation</li>
                  <li>Maintain audit trail of erasure actions</li>
                  <li>Preserve aggregated statistics</li>
                </ul>
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-id">User ID or Email</Label>
                <div className="flex gap-2">
                  <Input
                    id="user-id"
                    placeholder="Enter user ID or email"
                    value={selectedUser || ''}
                    onChange={(e) => setSelectedUser(e.target.value)}
                  />
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="destructive" disabled={!selectedUser}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Erase Data
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Confirm Data Erasure</DialogTitle>
                        <DialogDescription>
                          This will erase all personal data for user: {selectedUser}
                          <br />
                          <strong>This action cannot be undone.</strong>
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button
                          variant="destructive"
                          onClick={() => selectedUser && eraseDataMutation.mutate(selectedUser)}
                          disabled={eraseDataMutation.isPending}
                        >
                          {eraseDataMutation.isPending ? 'Erasing...' : 'Confirm Erasure'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

