/**
 * Administrator System Settings
 * 
 * System Configuration & Plugin Management
 * 
 * Features:
 * - Plugin management (hot-reload)
 * - System configuration
 * - Service health monitoring
 * - Policy engine settings
 */

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { 
  Plug,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Server,
  Save
} from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import apiClient from '@/lib/api-client'
import { getErrorMessage } from '@/lib/api-client'

interface Plugin {
  id: string
  name: string
  version: string
  status: 'loaded' | 'unloaded' | 'error'
  description: string
  can_reload: boolean
}

interface Service {
  name: string
  port: number
  status: 'online' | 'offline' | 'degraded'
  health: string
}

export function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    enable_ml_predictions: true,
    enable_event_sourcing: true,
    enable_audit_logging: true,
    enable_gdpr_compliance: true,
    max_concurrent_enrollments: 5,
    session_timeout_minutes: 30,
  })

  // Fetch plugins - REAL API ONLY
  const { data: plugins, isLoading: pluginsLoading, isError: pluginsError } = useQuery({
    queryKey: ['admin-plugins'],
    queryFn: async () => {
      const response = await apiClient.get<Plugin[]>('/api/v1/admin/plugins')
      return response.data || []
    },
    retry: 2,
  })

  // Fetch services - REAL API ONLY
  const { data: services, isLoading: servicesLoading, isError: servicesError } = useQuery({
    queryKey: ['admin-services'],
    queryFn: async () => {
      const response = await apiClient.get<Service[]>('/api/v1/admin/services')
      return response.data || []
    },
    retry: 2,
  })

  // Reload plugin mutation
  const reloadPluginMutation = useMutation({
    mutationFn: async (pluginId: string) => {
      const response = await apiClient.post(`/api/v1/admin/plugins/${pluginId}/reload`)
      return response.data
    },
    onSuccess: () => {
      toast.success('Plugin reloaded successfully')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: typeof settings) => {
      const response = await apiClient.post('/api/v1/admin/settings', data)
      return response.data
    },
    onSuccess: () => {
      toast.success('Settings saved successfully')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })

  const handleSaveSettings = () => {
    saveSettingsMutation.mutate(settings)
  }

  const getServiceStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return <Badge variant="default" className="bg-green-600">Online</Badge>
      case 'offline':
        return <Badge variant="destructive">Offline</Badge>
      case 'degraded':
        return <Badge variant="warning">Degraded</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">
          System Settings
        </h1>
        <p className="text-muted-foreground text-lg">
          Configure system behavior, manage plugins, and monitor services
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General Settings</TabsTrigger>
          <TabsTrigger value="plugins">Plugins</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
              <CardDescription>
                Configure core system features and behaviors
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Machine Learning Predictions</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable ML model predictions for enrollment and room optimization
                    </p>
                  </div>
                  <Switch
                    checked={settings.enable_ml_predictions}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, enable_ml_predictions: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Event Sourcing</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable event sourcing for audit trail and state reconstruction
                    </p>
                  </div>
                  <Switch
                    checked={settings.enable_event_sourcing}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, enable_event_sourcing: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Audit Logging</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable tamper-evident audit logging with hash chain
                    </p>
                  </div>
                  <Switch
                    checked={settings.enable_audit_logging}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, enable_audit_logging: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>GDPR Compliance</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable GDPR data erasure and pseudonymization features
                    </p>
                  </div>
                  <Switch
                    checked={settings.enable_gdpr_compliance}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, enable_gdpr_compliance: checked })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="max-enrollments">Max Concurrent Enrollments</Label>
                  <Input
                    id="max-enrollments"
                    type="number"
                    min="1"
                    max="10"
                    value={settings.max_concurrent_enrollments}
                    onChange={(e) =>
                      setSettings({ ...settings, max_concurrent_enrollments: parseInt(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                  <Input
                    id="session-timeout"
                    type="number"
                    min="5"
                    max="120"
                    value={settings.session_timeout_minutes}
                    onChange={(e) =>
                      setSettings({ ...settings, session_timeout_minutes: parseInt(e.target.value) })
                    }
                  />
                </div>
              </div>

              <Button
                onClick={handleSaveSettings}
                disabled={saveSettingsMutation.isPending}
                className="w-full"
              >
                {saveSettingsMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Settings
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plugins Tab */}
        <TabsContent value="plugins">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plug className="h-5 w-5" />
                Plugin Management
              </CardTitle>
              <CardDescription>
                Hot-reload plugins without restarting the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pluginsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-lg border border-border">
                      <div className="h-10 w-10 bg-muted animate-pulse rounded-full" />
                      <div className="flex-1">
                        <div className="h-4 w-32 bg-muted animate-pulse rounded mb-2" />
                        <div className="h-3 w-48 bg-muted animate-pulse rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : pluginsError ? (
                <div className="text-center py-12">
                  <Plug className="h-16 w-16 text-destructive mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Unable to Load Plugins
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Failed to fetch plugins from the API
                  </p>
                  <Button onClick={() => window.location.reload()}>Retry</Button>
                </div>
              ) : plugins && plugins.length > 0 ? (
                <div className="space-y-3">
                  {plugins.map((plugin) => (
                    <div
                      key={plugin.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-foreground">{plugin.name}</p>
                          <Badge variant="outline">v{plugin.version}</Badge>
                          {plugin.status === 'loaded' ? (
                            <Badge variant="default" className="bg-green-600">Loaded</Badge>
                          ) : plugin.status === 'error' ? (
                            <Badge variant="destructive">Error</Badge>
                          ) : (
                            <Badge variant="secondary">Unloaded</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{plugin.description}</p>
                      </div>
                      {plugin.can_reload && plugin.status === 'loaded' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => reloadPluginMutation.mutate(plugin.id)}
                          disabled={reloadPluginMutation.isPending}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Reload
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Plug className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Plugins</h3>
                  <p className="text-muted-foreground">Plugins will appear here when loaded</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Service Health
              </CardTitle>
              <CardDescription>
                Monitor microservice health and status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {servicesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-lg border border-border">
                      <div className="h-10 w-10 bg-muted animate-pulse rounded-full" />
                      <div className="flex-1">
                        <div className="h-4 w-32 bg-muted animate-pulse rounded mb-2" />
                        <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : servicesError ? (
                <div className="text-center py-12">
                  <Server className="h-16 w-16 text-destructive mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Unable to Load Services
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Failed to fetch service status from the API
                  </p>
                  <Button onClick={() => window.location.reload()}>Retry</Button>
                </div>
              ) : services && services.length > 0 ? (
                <div className="space-y-3">
                  {services.map((service) => (
                    <div
                      key={service.name}
                      className="flex items-center justify-between p-4 rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${
                          service.status === 'online' ? 'bg-green-500/10' :
                          service.status === 'offline' ? 'bg-red-500/10' :
                          'bg-yellow-500/10'
                        }`}>
                          {service.status === 'online' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : service.status === 'offline' ? (
                            <XCircle className="h-5 w-5 text-red-600" />
                          ) : (
                            <Server className="h-5 w-5 text-yellow-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{service.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Port {service.port} • {service.health}
                          </p>
                        </div>
                      </div>
                      {getServiceStatusBadge(service.status)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Server className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>No services found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

