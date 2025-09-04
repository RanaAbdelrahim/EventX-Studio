import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import { useAuth } from '../../state/AuthContext'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// Types definitions
interface Metric {
  key: 'events' | 'bookings' | 'revenue'
  value: number
  suffix?: string
}

interface SalesPoint { name: string; value: number }

interface SalesSummary {
  totalRevenue: number
  totalTickets: number
  totalEvents: number
  salesPoints: SalesPoint[]
}

interface UpcomingEventItem {
  _id: string
  title: string
  date: string
  time: string
  venue?: string
}

interface NotificationItem {
  _id: string
  message: string
  createdAt: string
  read: boolean
  link?: string
}

type SeatStatus = 'empty' | 'sold' | 'reserved'

interface SeatCell { r: number; c: number; status: SeatStatus }

interface SeatMapVM {
  rows: number
  cols: number
  cells: SeatCell[]
  event: {
    title: string
    date: string
    venue?: string
  }
}

// Helper functions
const formatINR = (n: number | undefined | null) => `₹${Number(n || 0).toLocaleString()}`
const formatNumber = (n: number | undefined | null) => Number(n || 0).toLocaleString()

export default function DashboardV2() {
  // Auth context for user information
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  // State for dashboard data
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null)
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEventItem[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [seatMap, setSeatMap] = useState<SeatMapVM | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('weekly')

  // UI state
  const [searchTerm, setSearchTerm] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(0)

  // Refs for dropdown menus
  const notificationsRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false)
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle search submission
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) navigate(`/admin/events?q=${encodeURIComponent(searchTerm)}`)
  }, [navigate, searchTerm])

  // Handle notification click
  const handleNotificationClick = useCallback(async (notificationId: string, link?: string) => {
    try {
      await api.post(`/notifications/${notificationId}/read`)

      setNotifications(prev => prev.map(n => (n._id === notificationId ? { ...n, read: true } : n)))
      setUnreadNotifications(prev => Math.max(0, prev - 1))

      if (link) navigate(link)
      setShowNotifications(false)
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }, [navigate])

  // Handle mark all as read
  const handleMarkAllAsRead = useCallback(async () => {
    try {
      const unread = notifications.filter(n => !n.read)
      await Promise.all(unread.map(n => api.post(`/notifications/${n._id}/read`)))
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadNotifications(0)
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err)
    }
  }, [notifications])

  // Fetch dashboard data on mount / period change
  useEffect(() => {
    const ac = new AbortController()

    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        const periodParam = period === 'weekly' ? 'week' : period === 'monthly' ? 'month' : 'year'

        // Individual API calls with better error handling
        try {
          // Get overview metrics
          const metricsRes = await api.get('/analytics/overview', { signal: ac.signal })
          
          const m: Metric[] = [
            { key: 'events', value: Number(metricsRes.data?.totalEvents || 0) },
            { key: 'bookings', value: Number(metricsRes.data?.ticketsSold || 0) },
            { key: 'revenue', value: Number(metricsRes.data?.totalRevenue || 0) },
          ]
          setMetrics(m)
        } catch (err: any) {
          console.error('Failed to load overview metrics:', err)
          // Use empty data but don't fail entire dashboard
          setMetrics([
            { key: 'events', value: 0 },
            { key: 'bookings', value: 0 },
            { key: 'revenue', value: 0 },
          ])
        }

        try {
          // Get sales summary
          const salesRes = await api.get(`/analytics/summary?period=${periodParam}`, { signal: ac.signal })
          
          setSalesSummary({
            totalRevenue: Number(salesRes.data?.totalRevenue || 0),
            totalTickets: Number(salesRes.data?.ticketsSold || 0),
            totalEvents: Number(salesRes.data?.totalEvents || 0),
            salesPoints: Array.isArray(salesRes.data?.salesData) ? salesRes.data.salesData : [],
          })
        } catch (err: any) {
          console.error('Failed to load sales summary:', err)
          // Use empty data but don't fail entire dashboard
          setSalesSummary({
            totalRevenue: 0,
            totalTickets: 0,
            totalEvents: 0,
            salesPoints: [],
          })
        }

        try {
          // Get upcoming events
          const upcomingRes = await api.get('/events', { params: { status: 'upcoming' }, signal: ac.signal })
          
          const upcomingData = Array.isArray(upcomingRes.data) ? upcomingRes.data : []
          const upcomingMapped: UpcomingEventItem[] = upcomingData.slice(0, 5).map((ev: any) => ({
            _id: String(ev._id),
            title: String(ev.title || 'Untitled Event'),
            date: ev.date ? new Date(ev.date).toLocaleDateString() : 'TBD',
            time: ev.time || 'TBD',
            venue: ev.venue,
          }))
          setUpcomingEvents(upcomingMapped)
        } catch (err: any) {
          console.error('Failed to load upcoming events:', err)
          setUpcomingEvents([])
        }

        try {
          // Get notifications - THIS WAS MISSING
          const notificationsRes = await api.get('/notifications', { signal: ac.signal })
          
          const notes: NotificationItem[] = Array.isArray(notificationsRes.data) ? notificationsRes.data : []
          setNotifications(notes)
          setUnreadNotifications(notes.filter(n => !n.read).length)
        } catch (err: any) {
          console.error('Failed to load notifications:', err)
          setNotifications([])
          setUnreadNotifications(0)
        }
        
        // Get seat map for latest event (if any)
        try {
          // Only fetch if we have upcoming events
          if (upcomingEvents.length > 0) {
            const latestEvent = upcomingEvents[0]
            const eventRes = await api.get(`/events/${latestEvent._id}`, { signal: ac.signal })
            const event = eventRes.data
            
            if (event?.seatMap?.rows && event?.seatMap?.cols) {
              // Format seat map data
              const rows = event.seatMap.rows || 0
              const cols = event.seatMap.cols || 0
              const cells = []
              
              for (let r = 1; r <= rows; r++) {
                for (let c = 1; c <= cols; c++) {
                  const id = `R${r}C${c}`
                  let status = 'empty' as SeatStatus
                  
                  if (event.seatMap.sold?.includes(id)) {
                    status = 'sold'
                  } else if (event.seatMap.reserved?.includes(id)) {
                    status = 'reserved'
                  }
                  
                  cells.push({ r, c, status })
                }
              }
              
              setSeatMap({
                rows,
                cols,
                cells,
                event: {
                  title: event.title,
                  date: new Date(event.date).toLocaleDateString(),
                  venue: event.venue
                }
              })
            }
          }
        } catch (err: any) {
          console.error('Failed to load seat map:', err)
          // Non-critical error, don't show to user
          setSeatMap(null)
        }
      } catch (err: any) {
        console.error('Error fetching dashboard data:', err)
        setError(err?.response?.data?.message || 'Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    return () => ac.abort()
  }, [period])

  // Period change
  const handlePeriodChange = (newPeriod: 'weekly' | 'monthly' | 'yearly') => setPeriod(newPeriod)

  // Seat map renderer
  const renderSeatMap = () => {
    if (!seatMap) return null
    const grid: JSX.Element[] = []
    for (let r = 1; r <= seatMap.rows; r++) {
      const row: JSX.Element[] = []
      for (let c = 1; c <= seatMap.cols; c++) {
        const cell = seatMap.cells.find((cell: any) => cell.r === r && cell.c === c)
        const bgColor = cell?.status === 'sold' ? 'bg-purple-600' : 
                      cell?.status === 'reserved' ? 'bg-gray-400' : 'bg-gray-200'
        
        row.push(
          <div key={`${r}-${c}`} className={`w-4 h-4 rounded-sm ${bgColor}`}></div>
        )
      }
      grid.push(
        <div key={r} className="flex gap-1">{row}</div>
      )
    }
    return <div className="flex flex-col gap-1">{grid}</div>
  }

  // Metrics getter
  const getMetric = (key: Metric['key']) => {
    const metric = metrics.find(m => m.key === key)
    if (!metric) return '—'
    return key === 'revenue' ? formatINR(metric.value) : formatNumber(metric.value)
  }

  if (loading) {
    return <div className="p-8 flex justify-center items-center min-h-[400px]">
      <div className="animate-pulse text-lg">Loading dashboard data...</div>
    </div>
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 text-red-600 p-4 rounded mb-4">
          {error}
        </div>
        <button className="btn" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Welcome Banner with Working Buttons */}
      <div className="bg-black text-white p-4 rounded-xl mb-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-gray-700 flex items-center justify-center text-xl">
            {user?.name?.charAt(0) || 'A'}
          </div>
          <div>
            <h2 className="font-semibold">Welcome {user?.name}</h2>
            <p className="text-sm text-gray-400">{user?.role}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Search Box */}
          <form onSubmit={handleSearch} className="relative">
            <input 
              type="text" 
              placeholder="Search..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-gray-800 text-white rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-gray-600"
            />
            <span className="absolute left-3 top-2.5 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
          </form>
          
          {/* Notifications Button */}
          <div className="relative" ref={notificationsRef}>
            <button 
              className="h-9 w-9 rounded-full bg-gray-800 flex items-center justify-center text-gray-300 relative"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadNotifications}
                </span>
              )}
            </button>
            
            {/* Notifications Dropdown - Dark theme */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-gray-900 rounded-lg shadow-lg z-10 overflow-hidden border border-gray-700">
                <div className="p-3 bg-gray-800 flex justify-between items-center">
                  <h3 className="font-medium text-white">Notifications</h3>
                  {unreadNotifications > 0 && (
                    <button 
                      className="text-sm text-blue-400 hover:text-blue-300"
                      onClick={handleMarkAllAsRead}
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-400">No notifications</div>
                  ) : (
                    notifications.slice(0, 7).map((note: any) => (
                      <div 
                        key={note._id}
                        className={`p-3 border-b border-gray-700 hover:bg-gray-800 cursor-pointer ${!note.read ? 'bg-gray-800' : ''}`}
                        onClick={() => handleNotificationClick(note._id, note.link)}
                      >
                        <p className={`text-gray-200 ${!note.read ? 'font-medium' : ''}`}>{note.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(note.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-2 bg-gray-800 text-center">
                  <button 
                    className="text-sm text-blue-400 hover:text-blue-300"
                    onClick={() => {
                      setShowNotifications(false)
                      navigate('/admin/notifications')
                    }}
                  >
                    View All Notifications
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Settings Button */}
          <div className="relative" ref={settingsRef}>
            <button 
              className="h-9 w-9 rounded-full bg-gray-800 flex items-center justify-center text-gray-300"
              onClick={() => setShowSettings(!showSettings)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            
            {/* Settings Dropdown - Dark theme */}
            {showSettings && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-900 rounded-lg shadow-lg z-10 overflow-hidden border border-gray-700">
                <div className="p-2">
                  <button 
                    className="w-full text-left px-4 py-2 text-gray-200 hover:bg-gray-800 rounded-md"
                    onClick={() => {
                      setShowSettings(false)
                      navigate('/admin/settings')
                    }}
                  >
                    General Settings
                  </button>
                  <button 
                    className="w-full text-left px-4 py-2 text-gray-200 hover:bg-gray-800 rounded-md"
                    onClick={() => {
                      setShowSettings(false)
                      navigate('/admin/users')
                    }}
                  >
                    User Management
                  </button>
                  <button 
                    className="w-full text-left px-4 py-2 text-gray-200 hover:bg-gray-800 rounded-md"
                    onClick={() => {
                      setShowSettings(false)
                      navigate('/admin/categories')
                    }}
                  >
                    Event Categories
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Profile Button */}
          <div className="relative" ref={profileRef}>
            <button 
              className="h-9 w-9 rounded-full bg-gray-800 flex items-center justify-center text-gray-300"
              onClick={() => setShowProfile(!showProfile)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </button>
            
            {/* Profile Dropdown - Dark theme */}
            {showProfile && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-900 rounded-lg shadow-lg z-10 overflow-hidden border border-gray-700">
                <div className="p-3 bg-gray-800">
                  <p className="font-medium text-white">{user?.name}</p>
                  <p className="text-xs text-gray-400">{user?.email}</p>
                </div>
                <div className="p-2">
                  <button 
                    className="w-full text-left px-4 py-2 text-gray-200 hover:bg-gray-800 rounded-md"
                    onClick={() => {
                      setShowProfile(false)
                      navigate('/admin/settings')
                    }}
                  >
                    Profile Settings
                  </button>
                  <button 
                    className="w-full text-left px-4 py-2 text-gray-200 hover:bg-gray-800 rounded-md"
                    onClick={() => {
                      setShowProfile(false)
                      logout()
                      navigate('/login')
                    }}
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="flex items-center justify-between">
            <div className="text-gray-500 text-sm font-semibold">EVENTS</div>
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl">
              📅
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold">{getMetric('events')} Events</div>
        </div>
        
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="flex items-center justify-between">
            <div className="text-gray-500 text-sm font-semibold">BOOKINGS</div>
            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-xl">
              🎟️
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold">{getMetric('bookings')}</div>
        </div>
        
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="flex items-center justify-between">
            <div className="text-gray-500 text-sm font-semibold">REVENUE</div>
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xl">
              💰
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-green-600">{getMetric('revenue')}</div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Net Sales */}
          <div className="bg-white rounded-2xl shadow p-5">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">NET SALES</h3>
              </div>
              
              <div className="flex text-sm">
                <span className="text-gray-500 mr-2">Filter:</span>
                <div className="flex rounded-lg overflow-hidden border">
                  <button 
                    className={`px-3 py-1 ${period === 'weekly' ? 'bg-black text-white' : 'bg-white'}`}
                    onClick={() => handlePeriodChange('weekly')}
                  >
                    Weekly
                  </button>
                  <button 
                    className={`px-3 py-1 ${period === 'monthly' ? 'bg-black text-white' : 'bg-white'}`}
                    onClick={() => handlePeriodChange('monthly')}
                  >
                    Monthly
                  </button>
                  <button 
                    className={`px-3 py-1 ${period === 'yearly' ? 'bg-black text-white' : 'bg-white'}`}
                    onClick={() => handlePeriodChange('yearly')}
                  >
                    Yearly
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap justify-between mb-6">
              <div>
                <div className="text-gray-500 text-sm">Total Revenue</div>
                <div className="font-bold text-lg">₹{salesSummary?.totalRevenue?.toLocaleString() || 0}</div>
              </div>
              <div>
                <div className="text-gray-500 text-sm">Total Tickets</div>
                <div className="font-bold text-lg">{salesSummary?.totalTickets?.toLocaleString() || 0} Tickets</div>
              </div>
              <div>
                <div className="text-gray-500 text-sm">Total Events</div>
                <div className="font-bold text-lg">{salesSummary?.totalEvents?.toLocaleString() || 0} Events</div>
              </div>
            </div>
            
            <div className="h-64">
              {salesSummary?.salesPoints?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesSummary.salesPoints}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Revenue']} />
                    <Bar dataKey="value" fill="#8884d8" name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  No sales data available for this period
                </div>
              )}
            </div>
          </div>
          
          {/* Latest Event */}
          <div className="bg-white rounded-2xl shadow p-5">
            <h3 className="font-semibold mb-4">Latest Event</h3>
            
            {seatMap ? (
              <div className="flex flex-wrap md:flex-nowrap justify-between">
                <div className="mb-4 md:mb-0">
                  <h4 className="font-medium">{seatMap.event.title}</h4>
                  <p className="text-sm text-gray-500">{seatMap.event.date} • {seatMap.event.venue}</p>
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gray-200 rounded-sm"></div>
                      <span className="text-sm">Available</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-purple-600 rounded-sm"></div>
                      <span className="text-sm">Sold</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gray-400 rounded-sm"></div>
                      <span className="text-sm">Reserved</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  {renderSeatMap()}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                No upcoming events found
              </div>
            )}
          </div>
        </div>
        
        {/* Right column (1/3) */}
        <div className="space-y-6">
          {/* Upcoming Events */}
          <div className="bg-white rounded-2xl shadow p-5">
            <h3 className="font-semibold mb-4">UPCOMING EVENTS</h3>
            
            {upcomingEvents.length > 0 ? (
              <div className="space-y-3">
                {upcomingEvents.map((event, idx) => (
                  <div key={idx} className="flex items-center gap-3 border-b pb-3 last:border-0">
                    <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                      📅
                    </div>
                    <div>
                      <p className="font-medium">{event.title}</p>
                      <p className="text-xs text-gray-500">{event.date} • {event.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                No upcoming events found
              </div>
            )}
            
            <div className="mt-3 text-right">
              <button 
                className="text-blue-600 text-sm font-medium hover:underline"
                onClick={() => navigate('/admin/events')}
              >
                See All
              </button>
            </div>
          </div>
          
          {/* Notifications */}
          <div className="bg-white rounded-2xl shadow p-5">
            <h3 className="font-semibold mb-4">Notifications</h3>
            
            {notifications.length > 0 ? (
              <div className="space-y-3">
                {notifications.slice(0, 4).map((note: any, idx) => (
                  <div 
                    key={idx} 
                    className={`flex items-start gap-3 border-b pb-3 last:border-0 ${!note.read ? 'bg-blue-50 -mx-2 px-2 rounded' : ''}`}
                  >
                    <div className={`h-8 w-8 ${!note.read ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'} rounded-full flex items-center justify-center text-sm`}>
                      {!note.read ? '🔔' : '✓'}
                    </div>
                    <div>
                      <p className={`text-sm ${!note.read ? 'font-medium' : ''}`}>{note.message}</p>
                      <p className="text-xs text-gray-500">{new Date(note.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                No notifications found
              </div>
            )}
            
            <div className="mt-3 text-right">
              <button 
                className="text-blue-600 text-sm font-medium hover:underline"
                onClick={() => navigate('/admin/notifications')}
              >
                See All
              </button>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow p-5">
            <h3 className="font-semibold mb-4">Quick Actions</h3>
            
            <div className="space-y-2">
              <button 
                className="w-full py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition flex items-center justify-center gap-2"
                onClick={() => navigate('/admin/events')}
              >
                <span>➕</span> Add New Event
              </button>
              
              <button 
                className="w-full py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition flex items-center justify-center gap-2"
                onClick={() => navigate('/admin/booking')}
              >
                <span>🎟️</span> Manage Bookings
              </button>
              
              <button 
                className="w-full py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition flex items-center justify-center gap-2"
                onClick={() => navigate('/admin/analytics')}
              >
                <span>📊</span> View Analytics
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
