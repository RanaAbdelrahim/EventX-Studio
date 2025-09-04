import { useState, useEffect } from 'react'
import api from '../../utils/api'
import { downloadFile } from '../../utils/downloadHelper';
import { useToast } from '../../context/ToastContext';

type BookingStatus = 'pending' | 'paid' | 'confirmed' | 'checked-in' | 'cancelled'

interface Booking {
  _id: string
  event: {
    _id: string
    title: string
  }
  user: {
    _id: string
    name: string
    email: string
  }
  seats: string[]
  status: BookingStatus
  pricePaid: number
  createdAt: string
}

export default function BookingTickets() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError('')
        const response = await api.get('/bookings/all')
        setBookings(response.data)
        setFilteredBookings(response.data)
      } catch (err: any) {
        console.error('Error fetching bookings:', err)
        setError(err?.response?.data?.message || 'Failed to load booking data')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Search filter
  useEffect(() => {
    if (!searchTerm) {
      setFilteredBookings(bookings)
      return
    }
    const q = searchTerm.toLowerCase()
    const filtered = bookings.filter(b =>
      b._id.toLowerCase().includes(q) ||
      b.event.title.toLowerCase().includes(q) ||
      b.user.name.toLowerCase().includes(q) ||
      b.user.email.toLowerCase().includes(q) ||
      b.seats.join(', ').toLowerCase().includes(q)
    )
    setFilteredBookings(filtered)
  }, [searchTerm, bookings])

  // Update booking status
  const handleStatusChange = async (bookingId: string, newStatus: BookingStatus) => {
    try {
      setUpdatingId(bookingId)
      await api.put(`/bookings/${bookingId}/status`, { status: newStatus })

      setBookings(prev =>
        prev.map(b => (b._id === bookingId ? { ...b, status: newStatus } : b))
      )
      setFilteredBookings(prev =>
        prev.map(b => (b._id === bookingId ? { ...b, status: newStatus } : b))
      )
    } catch (err: any) {
      console.error('Error updating booking status:', err)
      alert(err?.response?.data?.message || 'Failed to update booking status')
    } finally {
      setUpdatingId(null)
    }
  }

  // Export bookings
  const handleExport = () => {
    downloadFile({
      url: '/bookings/export',
      filename: 'bookings.xlsx',
      onStart: () => setExporting(true),
      onFinish: () => {
        setExporting(false);
        showToast('Bookings exported successfully!', 'success');
      },
      onError: (error) => {
        setExporting(false);
        showToast(`Export failed: ${error.message}`, 'error');
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Booking & Tickets Management</h2>
        <div>
          <button 
            className="btn" 
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? 'Exporting...' : 'Export Bookings'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="mb-4">
          <input
            className="input"
            placeholder="Search bookings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <p>Loading bookings...</p>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded">{error}</div>
        ) : (
          <>
            {filteredBookings.length === 0 ? (
              <p className="text-center py-4 text-gray-500">
                No bookings found matching your search.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Booking ID</th>
                      <th className="text-left py-2">Event</th>
                      <th className="text-left py-2">Customer</th>
                      <th className="text-left py-2">Seats</th>
                      <th className="text-left py-2">Price</th>
                      <th className="text-left py-2">Status</th>
                      <th className="text-left py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map(booking => (
                      <tr key={booking._id} className="border-b">
                        <td className="py-2">{booking._id.substring(0, 8)}...</td>
                        <td className="py-2">{booking.event.title}</td>
                        <td className="py-2">
                          <div className="flex flex-col">
                            <span>{booking.user.name}</span>
                            <span className="text-xs text-gray-500">{booking.user.email}</span>
                          </div>
                        </td>
                        <td className="py-2">{booking.seats.length ? booking.seats.join(', ') : '-'}</td>
                        <td className="py-2">₹{booking.pricePaid.toLocaleString()}</td>
                        <td className="py-2">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              booking.status === 'paid' || booking.status === 'confirmed'
                                ? 'bg-green-100 text-green-800'
                                : booking.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : booking.status === 'checked-in'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {booking.status}
                          </span>
                        </td>
                        <td className="py-2">
                          <button className="text-blue-500 hover:underline mr-2">View</button>

                          {booking.status === 'pending' && (
                            <button
                              className="text-green-500 hover:underline mr-2 disabled:opacity-50"
                              disabled={updatingId === booking._id}
                              onClick={() => handleStatusChange(booking._id, 'paid')}
                            >
                              Confirm
                            </button>
                          )}

                          {booking.status !== 'cancelled' && booking.status !== 'checked-in' && (
                            <button
                              className="text-red-500 hover:underline disabled:opacity-50"
                              disabled={updatingId === booking._id}
                              onClick={() => handleStatusChange(booking._id, 'cancelled')}
                            >
                              Cancel
                            </button>
                          )}

                          {(booking.status === 'paid' || booking.status === 'confirmed') && (
                            <button
                              className="text-blue-500 hover:underline ml-2 disabled:opacity-50"
                              disabled={updatingId === booking._id}
                              onClick={() => handleStatusChange(booking._id, 'checked-in')}
                            >
                              Check-in
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
