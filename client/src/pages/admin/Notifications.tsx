import { useState, useEffect } from 'react'
import api from '../../utils/api'

interface Notification {
  _id: string
  message: string
  read: boolean
  createdAt: string
  link?: string
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true)
        const response = await api.get('/notifications')
        setNotifications(response.data)
      } catch (err: any) {
        console.error('Failed to fetch notifications:', err)
        setError(err.response?.data?.message || 'Failed to load notifications')
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [])

  const markAsRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`)
      setNotifications(notifications.map(note => 
        note._id === id ? { ...note, read: true } : note
      ))
    } catch (err: any) {
      console.error('Failed to mark notification as read:', err)
      alert(err.response?.data?.message || 'Failed to mark as read')
    }
  }

  const markAllAsRead = async () => {
    try {
      const updates = notifications
        .filter(note => !note.read)
        .map(note => api.post(`/notifications/${note._id}/read`))
      
      await Promise.all(updates)
      
      setNotifications(notifications.map(note => ({ ...note, read: true })))
    } catch (err: any) {
      console.error('Failed to mark all as read:', err)
      alert(err.response?.data?.message || 'Failed to mark all as read')
    }
  }

  if (loading) {
    return <div className="text-center py-10">Loading notifications...</div>
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded mb-4">
        {error}
        <button 
          className="ml-4 underline"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Notifications</h2>
        {notifications.some(note => !note.read) && (
          <button 
            className="btn !bg-zinc-700"
            onClick={markAllAsRead}
          >
            Mark All as Read
          </button>
        )}
      </div>

      <div className="card divide-y">
        {notifications.length === 0 ? (
          <div className="py-10 text-center text-gray-500">
            You have no notifications
          </div>
        ) : (
          notifications.map(note => (
            <div 
              key={note._id}
              className={`py-3 px-1 flex items-start gap-3 ${!note.read ? 'bg-emerald-50' : ''}`}
            >
              <div className={`w-2 h-2 rounded-full mt-2 ${!note.read ? 'bg-emerald-500' : 'bg-gray-200'}`} />
              <div className="flex-grow">
                <p className={`${!note.read ? 'font-medium' : ''}`}>{note.message}</p>
                <p className="text-sm text-gray-500">
                  {new Date(note.createdAt).toLocaleDateString()} at {new Date(note.createdAt).toLocaleTimeString()}
                </p>
              </div>
              {!note.read && (
                <button 
                  className="text-sm text-gray-500 hover:text-black"
                  onClick={() => markAsRead(note._id)}
                >
                  Mark as Read
                </button>
              )}
              {note.link && (
                <a 
                  href={note.link}
                  className="text-blue-500 hover:underline ml-2"
                  target={note.link.startsWith('http') ? '_blank' : ''}
                  rel="noreferrer"
                >
                  View
                </a>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
