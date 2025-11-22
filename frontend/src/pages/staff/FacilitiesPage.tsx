/**
 * Staff Facilities Management Page
 * 
 * Manage campus facilities, rooms, and maintenance
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Building2, Search, Thermometer, Zap } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import apiClient from '@/lib/api-client'

interface Facility {
  id: string
  name: string
  code: string
  type: string
  total_rooms: number
  is_operational: boolean
  current_temperature: number
  current_energy_usage: number
}

export function StaffFacilitiesPage() {
  const [searchTerm, setSearchTerm] = useState('')

  const { data: facilities, isLoading, isError, error } = useQuery({
    queryKey: ['staff-facilities'],
    queryFn: async () => {
      const response = await apiClient.get<Facility[]>('/api/v1/staff/facilities')
      return response.data
    },
    retry: 2,
  })

  const filteredFacilities = facilities?.filter((facility) =>
    facility.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    facility.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Facilities Management</h1>
        <p className="text-muted-foreground mt-2">
          Monitor and manage campus facilities
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Facilities</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{facilities?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rooms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {facilities?.reduce((sum, f) => sum + f.total_rooms, 0) || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Temperature</CardTitle>
            <Thermometer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {facilities && facilities.length > 0
                ? (facilities.reduce((sum, f) => sum + f.current_temperature, 0) / facilities.length).toFixed(1)
                : 0}°C
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Energy Usage</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {facilities?.reduce((sum, f) => sum + f.current_energy_usage, 0).toFixed(0) || 0} kWh
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search facilities..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Facilities List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isError && (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center">
              <Building2 className="h-16 w-16 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Unable to Load Facilities
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {error?.message || 'Failed to fetch facility data'}
              </p>
              <Button onClick={() => window.location.reload()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <Card className="col-span-full">
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground">Loading facilities...</p>
            </CardContent>
          </Card>
        )}

        {filteredFacilities?.map((facility) => (
          <Card key={facility.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{facility.name}</CardTitle>
                  <CardDescription className="mt-1">{facility.code}</CardDescription>
                </div>
                <Badge variant={facility.is_operational ? "default" : "destructive"}>
                  {facility.is_operational ? "Operational" : "Maintenance"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium">{facility.type}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Rooms</span>
                <span className="font-medium">{facility.total_rooms}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Temperature</span>
                <span className="font-medium">{facility.current_temperature}°C</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Energy</span>
                <span className="font-medium">{facility.current_energy_usage.toFixed(1)} kWh</span>
              </div>

              <Button className="w-full mt-2" variant="outline" size="sm">
                Manage Facility
              </Button>
            </CardContent>
          </Card>
        ))}

        {filteredFacilities && filteredFacilities.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="py-10 text-center">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No facilities found
              </h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search criteria.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

