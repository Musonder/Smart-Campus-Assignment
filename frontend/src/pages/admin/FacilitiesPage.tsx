/**
 * Admin Facilities Management Page
 * 
 * Full CRUD for facilities and rooms management - Production Ready
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Building2, Search, Plus, Edit, Trash2, Loader2, MapPin, Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import apiClient, { getErrorMessage } from '@/lib/api-client'

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

interface Room {
  id: string
  facility_id: string
  facility_name: string
  room_number: string
  room_type: string
  floor: number
  capacity: number
  current_occupancy: number
  is_available: boolean
  has_projector: boolean
  has_whiteboard: boolean
  has_computers: boolean
  has_wifi: boolean
  has_video_conference: boolean
  temperature: number
}

interface CreateFacilityRequest {
  name: string
  code: string
  facility_type: string
  total_rooms: number
}

interface CreateRoomRequest {
  facility_id: string
  room_number: string
  room_type: string
  building: string
  floor: number
  capacity: number
  area_sqm: number
  has_projector: boolean
  has_whiteboard: boolean
  has_computers: boolean
  computer_count: number
  has_video_conference: boolean
  is_available: boolean
  is_bookable: boolean
}

export function AdminFacilitiesPage() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'facilities' | 'rooms'>('facilities')
  const [isCreateFacilityOpen, setIsCreateFacilityOpen] = useState(false)
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false)
  const [isEditFacilityOpen, setIsEditFacilityOpen] = useState(false)
  const [isEditRoomOpen, setIsEditRoomOpen] = useState(false)
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [facilityForm, setFacilityForm] = useState<CreateFacilityRequest>({
    name: '',
    code: '',
    facility_type: 'building',
    total_rooms: 0,
  })
  const [roomForm, setRoomForm] = useState<CreateRoomRequest>({
    facility_id: '',
    room_number: '',
    room_type: 'classroom',
    building: '',
    floor: 0,
    capacity: 20,
    area_sqm: 50,
    has_projector: false,
    has_whiteboard: true,
    has_computers: false,
    computer_count: 0,
    has_video_conference: false,
    is_available: true,
    is_bookable: true,
  })
  const [editFacilityForm, setEditFacilityForm] = useState<CreateFacilityRequest>({
    name: '',
    code: '',
    facility_type: 'building',
    total_rooms: 0,
  })
  const [editRoomForm, setEditRoomForm] = useState<CreateRoomRequest>({
    facility_id: '',
    room_number: '',
    room_type: 'classroom',
    building: '',
    floor: 0,
    capacity: 20,
    area_sqm: 50,
    has_projector: false,
    has_whiteboard: true,
    has_computers: false,
    computer_count: 0,
    has_video_conference: false,
    is_available: true,
    is_bookable: true,
  })

  // Fetch facilities - REAL API
  const { data: facilities, isLoading: facilitiesLoading, isError: facilitiesError, error: facilitiesErrorObj } = useQuery({
    queryKey: ['admin-facilities'],
    queryFn: async () => {
      const response = await apiClient.get<Facility[]>('/api/v1/facilities/rooms/facilities')
      return response.data
    },
    retry: 2,
  })

  // Fetch rooms - REAL API
  const { data: rooms, isLoading: roomsLoading, isError: roomsError, error: roomsErrorObj } = useQuery({
    queryKey: ['admin-rooms'],
    queryFn: async () => {
      const response = await apiClient.get<Room[]>('/api/v1/facilities/rooms')
      return response.data
    },
    retry: 2,
  })

  // Create facility mutation
  const createFacilityMutation = useMutation({
    mutationFn: async (data: CreateFacilityRequest) => {
      const response = await apiClient.post('/api/v1/facilities/rooms/facilities', data)
      return response.data
    },
    onSuccess: () => {
      toast.success('Facility created successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-facilities'] })
      setIsCreateFacilityOpen(false)
      setFacilityForm({ name: '', code: '', facility_type: 'building', total_rooms: 0 })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })

  // Create room mutation
  const createRoomMutation = useMutation({
    mutationFn: async (data: CreateRoomRequest) => {
      const response = await apiClient.post('/api/v1/facilities/rooms', data)
      return response.data
    },
    onSuccess: () => {
      toast.success('Room created successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-rooms'] })
      setIsCreateRoomOpen(false)
      setRoomForm({
        facility_id: '',
        room_number: '',
        room_type: 'classroom',
        building: '',
        floor: 0,
        capacity: 20,
        area_sqm: 50,
        has_projector: false,
        has_whiteboard: true,
        has_computers: false,
        computer_count: 0,
        has_video_conference: false,
        is_available: true,
        is_bookable: true,
      })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })

  // Delete mutations
  const deleteFacilityMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/v1/facilities/rooms/facilities/${id}`)
    },
    onSuccess: () => {
      toast.success('Facility deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-facilities'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })

  const deleteRoomMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/v1/facilities/rooms/${id}`)
    },
    onSuccess: () => {
      toast.success('Room deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-rooms'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })

  // Update facility mutation
  const updateFacilityMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CreateFacilityRequest }) => {
      const response = await apiClient.put(`/api/v1/facilities/rooms/facilities/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      toast.success('Facility updated successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-facilities'] })
      setIsEditFacilityOpen(false)
      setSelectedFacility(null)
      setEditFacilityForm({ name: '', code: '', facility_type: 'building', total_rooms: 0 })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })

  // Update room mutation
  const updateRoomMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CreateRoomRequest }) => {
      const response = await apiClient.put(`/api/v1/facilities/rooms/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      toast.success('Room updated successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-rooms'] })
      setIsEditRoomOpen(false)
      setSelectedRoom(null)
      setEditRoomForm({
        facility_id: '',
        room_number: '',
        room_type: 'classroom',
        building: '',
        floor: 0,
        capacity: 20,
        area_sqm: 50,
        has_projector: false,
        has_whiteboard: true,
        has_computers: false,
        computer_count: 0,
        has_video_conference: false,
        is_available: true,
        is_bookable: true,
      })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })

  const filteredFacilities = facilities?.filter((facility) =>
    facility.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    facility.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredRooms = rooms?.filter((room) =>
    room.room_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    room.facility_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    room.room_type.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDeleteFacility = (facility: Facility) => {
    if (confirm(`Are you sure you want to delete ${facility.name}? This will also delete all rooms in this facility.`)) {
      deleteFacilityMutation.mutate(facility.id)
    }
  }

  const handleDeleteRoom = (room: Room) => {
    if (confirm(`Are you sure you want to delete room ${room.room_number}?`)) {
      deleteRoomMutation.mutate(room.id)
    }
  }

  const handleEditFacility = (facility: Facility) => {
    setSelectedFacility(facility)
    setEditFacilityForm({
      name: facility.name,
      code: facility.code,
      facility_type: facility.type,
      total_rooms: facility.total_rooms,
    })
    setIsEditFacilityOpen(true)
  }

  const handleEditRoom = (room: Room) => {
    setSelectedRoom(room)
    setEditRoomForm({
      facility_id: room.facility_id,
      room_number: room.room_number,
      room_type: room.room_type,
      building: room.facility_name,
      floor: room.floor,
      capacity: room.capacity,
      area_sqm: 50, // Default since not in Room interface
      has_projector: room.has_projector,
      has_whiteboard: room.has_whiteboard,
      has_computers: room.has_computers,
      computer_count: 0, // Default
      has_video_conference: room.has_video_conference,
      is_available: room.is_available,
      is_bookable: true, // Default
    })
    setIsEditRoomOpen(true)
  }

  const handleUpdateFacility = () => {
    if (selectedFacility) {
      updateFacilityMutation.mutate({ id: selectedFacility.id, data: editFacilityForm })
    }
  }

  const handleUpdateRoom = () => {
    if (selectedRoom) {
      updateRoomMutation.mutate({ id: selectedRoom.id, data: editRoomForm })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Facilities Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage campus facilities and rooms
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'facilities' ? (
            <Button onClick={() => setIsCreateFacilityOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Facility
            </Button>
          ) : (
            <Button onClick={() => setIsCreateRoomOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Room
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === 'facilities' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('facilities')}
        >
          Facilities
        </Button>
        <Button
          variant={activeTab === 'rooms' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('rooms')}
        >
          Rooms
        </Button>
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
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rooms?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Rooms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {rooms?.filter(r => r.is_available).length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Capacity</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rooms?.reduce((sum, r) => sum + r.capacity, 0) || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={`Search ${activeTab}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Facilities List */}
      {activeTab === 'facilities' && (
        <Card>
          <CardHeader>
            <CardTitle>All Facilities</CardTitle>
            <CardDescription>
              {filteredFacilities?.length || 0} facilities found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {facilitiesError && (
              <div className="py-12 text-center">
                <Building2 className="h-16 w-16 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Unable to Load Facilities
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {facilitiesErrorObj instanceof Error ? facilitiesErrorObj.message : 'Failed to fetch facility data'}
                </p>
                <Button onClick={() => window.location.reload()}>Retry</Button>
              </div>
            )}

            {facilitiesLoading && (
              <div className="py-10 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Loading facilities...</p>
              </div>
            )}

            {!facilitiesLoading && !facilitiesError && (
              <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                {filteredFacilities?.map((facility) => (
                  <Card
                    key={facility.id}
                    className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="font-mono text-xs px-2 py-1">
                              {facility.code}
                            </Badge>
                            <Badge 
                              variant={facility.is_operational ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {facility.is_operational ? 'Operational' : 'Non-Operational'}
                            </Badge>
                          </div>
                          <CardTitle className="text-lg mb-1">{facility.name}</CardTitle>
                          <CardDescription className="text-xs mt-1 capitalize">
                            {facility.type}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Total Rooms</p>
                          <p className="font-semibold">{facility.total_rooms}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Temperature</p>
                          <p className="font-semibold">{facility.current_temperature}°C</p>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditFacility(facility)}
                          className="flex-1"
                        >
                          <Edit className="h-3.5 w-3.5 mr-1.5" />
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteFacility(facility)}
                          disabled={deleteFacilityMutation.isPending}
                          className="flex-1"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!facilitiesLoading && !facilitiesError && filteredFacilities && filteredFacilities.length === 0 && (
              <div className="py-10 text-center">
                <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No facilities found
                </h3>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your search or create a new facility.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Rooms List */}
      {activeTab === 'rooms' && (
        <Card>
          <CardHeader>
            <CardTitle>All Rooms</CardTitle>
            <CardDescription>
              {filteredRooms?.length || 0} rooms found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {roomsError && (
              <div className="py-12 text-center">
                <MapPin className="h-16 w-16 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Unable to Load Rooms
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {roomsErrorObj instanceof Error ? roomsErrorObj.message : 'Failed to fetch room data'}
                </p>
                <Button onClick={() => window.location.reload()}>Retry</Button>
              </div>
            )}

            {roomsLoading && (
              <div className="py-10 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Loading rooms...</p>
              </div>
            )}

            {!roomsLoading && !roomsError && (
              <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                {filteredRooms?.map((room) => (
                  <Card
                    key={room.id}
                    className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="font-mono text-xs px-2 py-1">
                              {room.room_number}
                            </Badge>
                            <Badge 
                              variant={room.is_available ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {room.is_available ? 'Available' : 'Occupied'}
                            </Badge>
                          </div>
                          <CardTitle className="text-base mb-1">{room.facility_name}</CardTitle>
                          <CardDescription className="text-xs mt-1">
                            Floor {room.floor} • {room.room_type.replace('_', ' ')}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Capacity</p>
                          <p className="font-semibold">{room.capacity} people</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Occupancy</p>
                          <p className="font-semibold">
                            {room.current_occupancy}/{room.capacity}
                          </p>
                        </div>
                      </div>
                      {(room.has_projector || room.has_computers || room.has_whiteboard || room.has_video_conference) && (
                        <div className="flex flex-wrap gap-1.5 pt-2 border-t">
                          {room.has_projector && (
                            <Badge variant="outline" className="text-xs px-2 py-0.5">
                              Projector
                            </Badge>
                          )}
                          {room.has_computers && (
                            <Badge variant="outline" className="text-xs px-2 py-0.5">
                              Computers
                            </Badge>
                          )}
                          {room.has_whiteboard && (
                            <Badge variant="outline" className="text-xs px-2 py-0.5">
                              Whiteboard
                            </Badge>
                          )}
                          {room.has_video_conference && (
                            <Badge variant="outline" className="text-xs px-2 py-0.5">
                              Video Conf
                            </Badge>
                          )}
                        </div>
                      )}
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditRoom(room)}
                          className="flex-1"
                        >
                          <Edit className="h-3.5 w-3.5 mr-1.5" />
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteRoom(room)}
                          disabled={deleteRoomMutation.isPending}
                          className="flex-1"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!roomsLoading && !roomsError && filteredRooms && filteredRooms.length === 0 && (
              <div className="py-10 text-center">
                <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No rooms found
                </h3>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your search or create a new room.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Facility Dialog */}
      <Dialog open={isCreateFacilityOpen} onOpenChange={setIsCreateFacilityOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Facility</DialogTitle>
            <DialogDescription>
              Add a new facility to the system.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="facility-name">Name</Label>
              <Input
                id="facility-name"
                value={facilityForm.name}
                onChange={(e) => setFacilityForm({ ...facilityForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="facility-code">Code</Label>
              <Input
                id="facility-code"
                value={facilityForm.code}
                onChange={(e) => setFacilityForm({ ...facilityForm, code: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="facility-type">Type</Label>
              <Select
                value={facilityForm.facility_type}
                onValueChange={(value) => setFacilityForm({ ...facilityForm, facility_type: value })}
              >
                <SelectTrigger id="facility-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="building">Building</SelectItem>
                  <SelectItem value="hall">Hall</SelectItem>
                  <SelectItem value="lab">Laboratory</SelectItem>
                  <SelectItem value="library">Library</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="facility-rooms">Total Rooms</Label>
              <Input
                id="facility-rooms"
                type="number"
                min="0"
                value={facilityForm.total_rooms}
                onChange={(e) => setFacilityForm({ ...facilityForm, total_rooms: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateFacilityOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => createFacilityMutation.mutate(facilityForm)} disabled={createFacilityMutation.isPending}>
              {createFacilityMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Facility
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Room Dialog */}
      <Dialog open={isCreateRoomOpen} onOpenChange={setIsCreateRoomOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Room</DialogTitle>
            <DialogDescription>
              Add a new room to a facility.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="room-facility">Facility</Label>
              <Select
                value={roomForm.facility_id}
                onValueChange={(value) => setRoomForm({ ...roomForm, facility_id: value })}
              >
                <SelectTrigger id="room-facility">
                  <SelectValue placeholder="Select facility" />
                </SelectTrigger>
                <SelectContent>
                  {facilities?.map((facility) => (
                    <SelectItem key={facility.id} value={facility.id}>
                      {facility.name} ({facility.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="room-number">Room Number</Label>
                <Input
                  id="room-number"
                  value={roomForm.room_number}
                  onChange={(e) => setRoomForm({ ...roomForm, room_number: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="room-type">Room Type</Label>
                <Select
                  value={roomForm.room_type}
                  onValueChange={(value) => setRoomForm({ ...roomForm, room_type: value })}
                >
                  <SelectTrigger id="room-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="classroom">Classroom</SelectItem>
                    <SelectItem value="computer_lab">Computer Lab</SelectItem>
                    <SelectItem value="study_room">Study Room</SelectItem>
                    <SelectItem value="lecture_hall">Lecture Hall</SelectItem>
                    <SelectItem value="meeting_room">Meeting Room</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="room-building">Building</Label>
                <Input
                  id="room-building"
                  value={roomForm.building}
                  onChange={(e) => setRoomForm({ ...roomForm, building: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="room-floor">Floor</Label>
                <Input
                  id="room-floor"
                  type="number"
                  value={roomForm.floor}
                  onChange={(e) => setRoomForm({ ...roomForm, floor: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="room-capacity">Capacity</Label>
                <Input
                  id="room-capacity"
                  type="number"
                  min="1"
                  value={roomForm.capacity}
                  onChange={(e) => setRoomForm({ ...roomForm, capacity: parseInt(e.target.value) || 20 })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="room-area">Area (sqm)</Label>
              <Input
                id="room-area"
                type="number"
                min="0"
                value={roomForm.area_sqm}
                onChange={(e) => setRoomForm({ ...roomForm, area_sqm: parseFloat(e.target.value) || 50 })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="room-projector"
                  checked={roomForm.has_projector}
                  onChange={(e) => setRoomForm({ ...roomForm, has_projector: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="room-projector">Has Projector</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="room-computers"
                  checked={roomForm.has_computers}
                  onChange={(e) => setRoomForm({ ...roomForm, has_computers: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="room-computers">Has Computers</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="room-video"
                  checked={roomForm.has_video_conference}
                  onChange={(e) => setRoomForm({ ...roomForm, has_video_conference: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="room-video">Video Conference</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="room-available"
                  checked={roomForm.is_available}
                  onChange={(e) => setRoomForm({ ...roomForm, is_available: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="room-available">Available</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateRoomOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => createRoomMutation.mutate(roomForm)} disabled={createRoomMutation.isPending}>
              {createRoomMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Facility Dialog */}
      <Dialog open={isEditFacilityOpen} onOpenChange={setIsEditFacilityOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Facility</DialogTitle>
            <DialogDescription>
              Update facility information.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-facility-name">Name</Label>
              <Input
                id="edit-facility-name"
                value={editFacilityForm.name}
                onChange={(e) => setEditFacilityForm({ ...editFacilityForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-facility-code">Code</Label>
              <Input
                id="edit-facility-code"
                value={editFacilityForm.code}
                onChange={(e) => setEditFacilityForm({ ...editFacilityForm, code: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-facility-type">Type</Label>
              <Select
                value={editFacilityForm.facility_type}
                onValueChange={(value) => setEditFacilityForm({ ...editFacilityForm, facility_type: value })}
              >
                <SelectTrigger id="edit-facility-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="building">Building</SelectItem>
                  <SelectItem value="hall">Hall</SelectItem>
                  <SelectItem value="lab">Laboratory</SelectItem>
                  <SelectItem value="library">Library</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-facility-rooms">Total Rooms</Label>
              <Input
                id="edit-facility-rooms"
                type="number"
                min="0"
                value={editFacilityForm.total_rooms}
                onChange={(e) => setEditFacilityForm({ ...editFacilityForm, total_rooms: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditFacilityOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateFacility} disabled={updateFacilityMutation.isPending}>
              {updateFacilityMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Facility
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Room Dialog */}
      <Dialog open={isEditRoomOpen} onOpenChange={setIsEditRoomOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Room</DialogTitle>
            <DialogDescription>
              Update room information.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-room-facility">Facility</Label>
              <Select
                value={editRoomForm.facility_id}
                onValueChange={(value) => setEditRoomForm({ ...editRoomForm, facility_id: value })}
              >
                <SelectTrigger id="edit-room-facility">
                  <SelectValue placeholder="Select facility" />
                </SelectTrigger>
                <SelectContent>
                  {facilities?.map((facility) => (
                    <SelectItem key={facility.id} value={facility.id}>
                      {facility.name} ({facility.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-room-number">Room Number</Label>
                <Input
                  id="edit-room-number"
                  value={editRoomForm.room_number}
                  onChange={(e) => setEditRoomForm({ ...editRoomForm, room_number: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-room-type">Room Type</Label>
                <Select
                  value={editRoomForm.room_type}
                  onValueChange={(value) => setEditRoomForm({ ...editRoomForm, room_type: value })}
                >
                  <SelectTrigger id="edit-room-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="classroom">Classroom</SelectItem>
                    <SelectItem value="computer_lab">Computer Lab</SelectItem>
                    <SelectItem value="study_room">Study Room</SelectItem>
                    <SelectItem value="lecture_hall">Lecture Hall</SelectItem>
                    <SelectItem value="meeting_room">Meeting Room</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-room-building">Building</Label>
                <Input
                  id="edit-room-building"
                  value={editRoomForm.building}
                  onChange={(e) => setEditRoomForm({ ...editRoomForm, building: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-room-floor">Floor</Label>
                <Input
                  id="edit-room-floor"
                  type="number"
                  value={editRoomForm.floor}
                  onChange={(e) => setEditRoomForm({ ...editRoomForm, floor: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-room-capacity">Capacity</Label>
                <Input
                  id="edit-room-capacity"
                  type="number"
                  min="1"
                  value={editRoomForm.capacity}
                  onChange={(e) => setEditRoomForm({ ...editRoomForm, capacity: parseInt(e.target.value) || 20 })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-room-area">Area (sqm)</Label>
              <Input
                id="edit-room-area"
                type="number"
                min="0"
                value={editRoomForm.area_sqm}
                onChange={(e) => setEditRoomForm({ ...editRoomForm, area_sqm: parseFloat(e.target.value) || 50 })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-room-projector"
                  checked={editRoomForm.has_projector}
                  onChange={(e) => setEditRoomForm({ ...editRoomForm, has_projector: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="edit-room-projector">Has Projector</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-room-computers"
                  checked={editRoomForm.has_computers}
                  onChange={(e) => setEditRoomForm({ ...editRoomForm, has_computers: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="edit-room-computers">Has Computers</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-room-whiteboard"
                  checked={editRoomForm.has_whiteboard}
                  onChange={(e) => setEditRoomForm({ ...editRoomForm, has_whiteboard: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="edit-room-whiteboard">Has Whiteboard</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-room-video"
                  checked={editRoomForm.has_video_conference}
                  onChange={(e) => setEditRoomForm({ ...editRoomForm, has_video_conference: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="edit-room-video">Video Conference</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-room-available"
                  checked={editRoomForm.is_available}
                  onChange={(e) => setEditRoomForm({ ...editRoomForm, is_available: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="edit-room-available">Available</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditRoomOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRoom} disabled={updateRoomMutation.isPending}>
              {updateRoomMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

