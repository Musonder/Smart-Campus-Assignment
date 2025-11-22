/**
 * Student Facilities Page
 * 
 * Browse campus facilities and book rooms for study/events
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, Search, MapPin, Users, Calendar, Clock, Wifi, MonitorPlay, Coffee } from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import apiClient, { getErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'

interface Room {
  id: string
  facility_name: string
  room_number: string
  room_type: string
  capacity: number
  current_occupancy: number
  is_available: boolean
  has_projector: boolean
  has_whiteboard: boolean
  has_computers: boolean
  has_wifi: boolean
  has_video_conference: boolean
  floor: number
}

export function FacilitiesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [bookingDate, setBookingDate] = useState('')
  const [bookingTime, setBookingTime] = useState('')
  const [bookingDuration, setBookingDuration] = useState('1')
  const queryClient = useQueryClient()

  // Fetch available rooms - REAL API ONLY
  const { data: rooms, isLoading, isError, error } = useQuery({
    queryKey: ['facilities-rooms'],
    queryFn: async () => {
      const response = await apiClient.get<Room[]>('/api/v1/facilities/rooms')
      return response.data || []
    },
    retry: 2,
    retryDelay: 1000,
  })

  // Book room mutation
  const bookRoomMutation = useMutation({
    mutationFn: async (data: { room_id: string; date: string; time: string; duration: number }) => {
      const response = await apiClient.post('/api/v1/facilities/bookings', data)
      return response.data
    },
    onSuccess: () => {
      toast.success('Room booked successfully!')
      setSelectedRoom(null)
      queryClient.invalidateQueries({ queryKey: ['facilities-rooms'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })

  const handleBookRoom = () => {
    if (!selectedRoom || !bookingDate || !bookingTime || !bookingDuration) {
      toast.error('Please fill in all booking details')
      return
    }

    bookRoomMutation.mutate({
      room_id: selectedRoom.id,
      date: bookingDate,
      time: bookingTime,
      duration: parseInt(bookingDuration),
    })
  }

  const filteredRooms = rooms?.filter((room) =>
    room.room_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    room.facility_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    room.room_type.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Group rooms by facility (handle undefined/null safely)
  const roomsByFacility = (filteredRooms || []).reduce((acc, room) => {
    const facilityName = room.facility_name || 'Unknown Facility'
    if (!acc[facilityName]) {
      acc[facilityName] = []
    }
    acc[facilityName].push(room)
    return acc
  }, {} as Record<string, Room[]>)

  const getRoomTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'computer_lab':
        return MonitorPlay
      case 'classroom':
        return Building2
      case 'study_room':
        return Coffee
      default:
        return Building2
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">
          Campus Facilities
        </h1>
        <p className="text-muted-foreground text-lg">
          Browse and book campus facilities for studying and events
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search rooms, buildings, or facilities..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rooms</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rooms?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Now</CardTitle>
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Buildings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {roomsByFacility ? Object.keys(roomsByFacility).length : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rooms by Facility */}
      {isError ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Unable to Load Facilities
            </h3>
            <p className="text-muted-foreground mb-4">
              {error?.message || 'Failed to fetch facility data. Please ensure the facility service is running.'}
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['facilities-rooms'] })}>
                Retry
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Reload Page
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-4 text-muted-foreground">Loading facilities...</p>
          </CardContent>
        </Card>
      ) : roomsByFacility && Object.keys(roomsByFacility).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(roomsByFacility).map(([facilityName, facilityRooms]) => (
            <div key={facilityName}>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Building2 className="h-6 w-6" />
                {facilityName}
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {facilityRooms.map((room) => {
                  const RoomIcon = getRoomTypeIcon(room.room_type)
                  
                  return (
                    <Card key={room.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <RoomIcon className="h-5 w-5 text-primary" />
                            <CardTitle>{room.room_number}</CardTitle>
                          </div>
                          <Badge variant={room.is_available ? "default" : "secondary"}>
                            {room.is_available ? 'Available' : 'Occupied'}
                          </Badge>
                        </div>
                        <CardDescription>
                          Floor {room.floor} • {room.room_type.replace('_', ' ')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Capacity */}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            Capacity
                          </span>
                          <span className="font-medium">
                            {room.current_occupancy} / {room.capacity}
                          </span>
                        </div>

                        {/* Features */}
                        <div className="flex flex-wrap gap-2">
                          {room.has_wifi && (
                            <Badge variant="outline" className="text-xs">
                              <Wifi className="h-3 w-3 mr-1" />
                              WiFi
                            </Badge>
                          )}
                          {room.has_projector && (
                            <Badge variant="outline" className="text-xs">
                              <MonitorPlay className="h-3 w-3 mr-1" />
                              Projector
                            </Badge>
                          )}
                          {room.has_computers && (
                            <Badge variant="outline" className="text-xs">
                              Computers
                            </Badge>
                          )}
                          {room.has_whiteboard && (
                            <Badge variant="outline" className="text-xs">
                              Whiteboard
                            </Badge>
                          )}
                          {room.has_video_conference && (
                            <Badge variant="outline" className="text-xs">
                              Video Conf
                            </Badge>
                          )}
                        </div>

                        {/* Occupancy Bar */}
                        <div>
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Occupancy</span>
                            <span>{Math.round((room.current_occupancy / room.capacity) * 100)}%</span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-2">
                            <div
                              className={cn(
                                "h-2 rounded-full transition-all",
                                room.current_occupancy / room.capacity > 0.8
                                  ? "bg-red-500"
                                  : room.current_occupancy / room.capacity > 0.5
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                              )}
                              style={{
                                width: `${Math.min((room.current_occupancy / room.capacity) * 100, 100)}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Book Button */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              className="w-full"
                              variant={room.is_available ? "default" : "secondary"}
                              disabled={!room.is_available}
                              onClick={() => setSelectedRoom(room)}
                            >
                              <Calendar className="h-4 w-4 mr-2" />
                              {room.is_available ? 'Book Room' : 'Not Available'}
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Book {room.room_number}</DialogTitle>
                              <DialogDescription>
                                {room.facility_name} - Floor {room.floor}
                              </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label htmlFor="booking-date">Date</Label>
                                <Input
                                  id="booking-date"
                                  type="date"
                                  value={bookingDate}
                                  onChange={(e) => setBookingDate(e.target.value)}
                                  min={new Date().toISOString().split('T')[0]}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="booking-time">Start Time</Label>
                                <Input
                                  id="booking-time"
                                  type="time"
                                  value={bookingTime}
                                  onChange={(e) => setBookingTime(e.target.value)}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="booking-duration">Duration (hours)</Label>
                                <Input
                                  id="booking-duration"
                                  type="number"
                                  min="1"
                                  max="8"
                                  value={bookingDuration}
                                  onChange={(e) => setBookingDuration(e.target.value)}
                                />
                              </div>

                              {/* Room Info */}
                              <div className="p-4 bg-muted rounded-lg space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Capacity</span>
                                  <span className="font-medium">{room.capacity} people</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Type</span>
                                  <span className="font-medium">{room.room_type.replace('_', ' ')}</span>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {room.has_wifi && <Badge variant="outline" className="text-xs">WiFi</Badge>}
                                  {room.has_projector && <Badge variant="outline" className="text-xs">Projector</Badge>}
                                  {room.has_computers && <Badge variant="outline" className="text-xs">Computers</Badge>}
                                </div>
                              </div>
                            </div>

                            <DialogFooter>
                              <Button
                                onClick={handleBookRoom}
                                disabled={bookRoomMutation.isPending}
                              >
                                {bookRoomMutation.isPending ? 'Booking...' : 'Confirm Booking'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No Facilities Found
            </h3>
            <p className="text-muted-foreground">
              {searchTerm ? 'Try adjusting your search criteria' : 'No facilities are currently available'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* My Bookings */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4">My Bookings</h2>
        <Card>
          <CardContent className="py-8 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              Your room bookings will appear here
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

