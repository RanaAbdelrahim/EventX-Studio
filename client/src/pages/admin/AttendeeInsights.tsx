import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../utils/api'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import { downloadFile } from '../../utils/downloadHelper';
import { useToast } from '../../context/ToastContext';

export default function AttendeeInsights() {
  const [data, setData] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [exporting, setExporting] = useState(false);
  const { showToast } = useToast();
  
  // Colors for charts
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#a4de6c', '#d0ed57']
  
  useEffect(() => { 
    const fetchData = async () => {
      try {
        setLoading(true)
        setError('')
        
        // Load demographics data
        const demographicsResponse = await api.get('/analytics/demographics')
        setData(demographicsResponse.data)
        
        // Load events data
        const eventsResponse = await api.get('/events')
        setEvents(eventsResponse.data)
      } catch (err: any) {
        console.error('Error loading attendee insights:', err)
        setError(err?.response?.data?.message || 'Failed to load insights data')
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [])
  
  // Handle filter change
  const handleFilterChange = (filter: string) => {
    setSelectedFilter(filter)
  }
  
  // Format data for the location chart
  const getLocationData = () => {
    if (!data?.byLocation) return []
    
    return data.byLocation
      .filter((item: any) => item._id) // Filter out null/undefined locations
      .map((item: any) => ({
        name: item._id || 'Unknown',
        count: item.count
      }))
      .sort((a: any, b: any) => b.count - a.count) // Sort by count descending
  }
  
  // Format data for the interests chart
  const getInterestsData = () => {
    if (!data?.byInterests) return []
    
    return data.byInterests
      .filter((item: any) => item._id) // Filter out null/undefined interests
      .map((item: any) => ({
        name: item._id || 'Unknown',
        value: item.count
      }))
      .sort((a: any, b: any) => b.value - a.value) // Sort by value descending
      .slice(0, 6) // Show only top 6 interests
  }
  
  // Format data for the gender chart
  const getGenderData = () => {
    if (!data?.byGender) return []
    
    return data.byGender
      .filter((item: any) => item._id) // Filter out null/undefined genders
      .map((item: any) => ({
        name: item._id || 'Unknown',
        value: item.count
      }))
  }
  
  // Filter events based on selected filter
  const getFilteredEvents = () => {
    if (selectedFilter === 'all') return events
    return events.filter((event: any) => event.status === selectedFilter)
  }
  
  const handleExportAnalytics = () => {
    downloadFile({
      url: '/analytics/export',
      filename: 'attendee-insights.xlsx',
      onStart: () => setExporting(true),
      onFinish: () => {
        setExporting(false);
        showToast('Export successful!', 'success');
      },
      onError: (error) => {
        setExporting(false);
        showToast(`Export failed: ${error.message}`, 'error');
      }
    });
  };
  
  if (loading) return <div className="flex justify-center items-center h-64"><div className="loader">Loading...</div></div>
  
  if (error) return <div className="bg-red-50 p-4 rounded-lg text-red-500">{error}</div>
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">All Attendee Insights</h2>
        
        <div className="flex gap-2">
          <button
            className={`px-3 py-1 rounded-md ${selectedFilter === 'all' ? 'bg-black text-white' : 'bg-gray-200'}`}
            onClick={() => handleFilterChange('all')}
          >
            All Events
          </button>
          <button
            className={`px-3 py-1 rounded-md ${selectedFilter === 'upcoming' ? 'bg-black text-white' : 'bg-gray-200'}`}
            onClick={() => handleFilterChange('upcoming')}
          >
            Upcoming
          </button>
          <button
            className={`px-3 py-1 rounded-md ${selectedFilter === 'active' ? 'bg-black text-white' : 'bg-gray-200'}`}
            onClick={() => handleFilterChange('active')}
          >
            Active
          </button>
        </div>
      </div>
      
      {/* Event cards with insights links */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {getFilteredEvents().slice(0, 6).map((event: any) => (
          <div key={event._id} className="card hover:shadow-lg transition-shadow">
            <h3 className="font-medium">{event.title}</h3>
            <p className="text-sm text-gray-500 mb-3">
              {new Date(event.date).toLocaleDateString()} • {event.venue}
            </p>
            <div className="flex items-center justify-between text-sm mb-3">
              <span className={`px-2 py-1 rounded ${
                event.status === 'upcoming' ? 'bg-blue-100 text-blue-800' : 
                event.status === 'active' ? 'bg-green-100 text-green-800' : 
                'bg-gray-100 text-gray-800'
              }`}>
                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
              </span>
              <span>₹{event.price.toLocaleString()}</span>
            </div>
            <Link 
              to={`/admin/event-insights/${event._id}`} 
              className="btn !bg-indigo-600 w-full text-center"
            >
              View Detailed Insights
            </Link>
          </div>
        ))}
      </div>
      
      <div className="card">
        <h3 className="font-semibold mb-3">Attendee Locations</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={getLocationData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value) => [value, 'Attendees']} />
            <Legend />
            <Bar dataKey="count" name="Attendees" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold mb-3">Interests</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie 
                data={getInterestsData()} 
                dataKey="value" 
                nameKey="name" 
                cx="50%" 
                cy="50%" 
                outerRadius={100}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {getInterestsData().map((_: any, idx: number) => (
                  <Cell key={idx} fill={["#10b981","#6366f1","#f59e0b","#ef4444","#22d3ee"][idx % 5]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [value, 'Attendees']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="card">
          <h3 className="font-semibold mb-3">Gender Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie 
                data={getGenderData()} 
                dataKey="value" 
                nameKey="name" 
                cx="50%" 
                cy="50%" 
                outerRadius={100}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {getGenderData().map((_: any, idx: number) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [value, 'Attendees']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="flex justify-end mt-4">
        <button
          className="btn !bg-emerald-600"
          onClick={handleExportAnalytics}
          disabled={exporting}
        >
          {exporting ? 'Exporting...' : 'Export All Analytics Data'}
        </button>
      </div>
    </div>
  )
}
