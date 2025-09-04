import { Navigate, Route, Routes, Link } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import DashboardV2 from './pages/admin/DashboardV2'
import ManageEvents from './pages/admin/ManageEvents'
import AttendeeInsights from './pages/admin/AttendeeInsights'
import BrowseEvents from './pages/user/BrowseEvents'
import EventDetails from './pages/user/EventDetails'
import MyTickets from './pages/user/MyTickets'
import { useAuth } from './state/AuthContext'
import AdminLayout from './components/AdminLayout'
import { ToastProvider } from './context/ToastContext'

// Import new page components
import BookingTickets from './pages/admin/BookingTickets'
import AnalyticsReports from './pages/admin/AnalyticsReports'
import ContactSupport from './pages/admin/ContactSupport'
import Notifications from './pages/admin/Notifications'
import Settings from './pages/admin/Settings'
import Marketing from './pages/admin/Marketing'
import EventCategories from './pages/admin/EventCategories'
import ManageUsers from './pages/admin/ManageUsers'
import EventInsightsDashboard from './pages/admin/EventInsightsDashboard'
import EventManagement from './pages/admin/EventManagement'

function Protected({ children, role }: { children: JSX.Element; role?: 'admin' | 'user' }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="p-8">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { user, logout } = useAuth()
  return (
    <ToastProvider>
      <div>
        <header className="sticky top-0 z-10 bg-black text-white">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4 justify-between">
            <Link to="/" className="font-semibold">EventX Studio</Link>
            <nav className="flex items-center gap-3">
              <Link to="/events" className="hover:underline">Browse Events</Link>
              {user?.role === 'admin' && <Link to="/admin" className="hover:underline">Admin</Link>}
              {user ? <button className="btn !bg-zinc-700" onClick={logout}>Logout</button> : <Link to="/login" className="btn">Login</Link>}
            </nav>
          </div>
        </header>

        <main className="max-w-full mx-auto">
          <Routes>
            <Route path="/" element={<BrowseEvents />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/events" element={<BrowseEvents />} />
            <Route path="/events/:id" element={<EventDetails />} />
            <Route path="/me/tickets" element={<Protected role="user"><MyTickets /></Protected>} />
            <Route path="/logout" element={<Navigate to="/" replace />} />

            {/* Admin routes - Use DashboardV2 as the main dashboard */}
            <Route path="/admin" element={<Protected role="admin"><AdminLayout><DashboardV2 /></AdminLayout></Protected>} />
            <Route path="/admin/events" element={<Protected role="admin"><AdminLayout><ManageEvents /></AdminLayout></Protected>} />
            <Route path="/admin/insights" element={<Protected role="admin"><AdminLayout><AttendeeInsights /></AdminLayout></Protected>} />
            
            {/* New admin routes */}
            <Route path="/admin/booking" element={<Protected role="admin"><AdminLayout><BookingTickets /></AdminLayout></Protected>} />
            <Route path="/admin/analytics" element={<Protected role="admin"><AdminLayout><AnalyticsReports /></AdminLayout></Protected>} />
            <Route path="/admin/support" element={<Protected role="admin"><AdminLayout><ContactSupport /></AdminLayout></Protected>} />
            <Route path="/admin/notifications" element={<Protected role="admin"><AdminLayout><Notifications /></AdminLayout></Protected>} />
            <Route path="/admin/settings" element={<Protected role="admin"><AdminLayout><Settings /></AdminLayout></Protected>} />
            <Route path="/admin/marketing" element={<Protected role="admin"><AdminLayout><Marketing /></AdminLayout></Protected>} />
            <Route path="/admin/categories" element={<Protected role="admin"><AdminLayout><EventCategories /></AdminLayout></Protected>} />
            <Route path="/admin/users" element={<Protected role="admin"><AdminLayout><ManageUsers /></AdminLayout></Protected>} />
            <Route path="/admin/event-management" element={<Protected role="admin"><AdminLayout><EventManagement /></AdminLayout></Protected>} />
            
            {/* Event Insights Dashboard (accessible directly for full-screen view) */}
            <Route path="/admin/event-insights/:id" element={<Protected role="admin"><EventInsightsDashboard /></Protected>} />
          </Routes>
        </main>
      </div>
    </ToastProvider>
  )
}
