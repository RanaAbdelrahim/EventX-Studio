import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../utils/api'
import { IEvent } from '../../types'

export default function BrowseEvents() {
  const [events, setEvents] = useState<IEvent[]>([])
  const [q, setQ] = useState('')
  const load = () => api.get('/events', { params: q ? { q } : {} }).then(r=>setEvents(r.data))
  useEffect(() => { load() }, [])
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <input className="input" placeholder="Search events..." value={q} onChange={e=>setQ(e.target.value)} />
        <button className="btn" onClick={load}>Search</button>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {events.map(e => (
          <Link key={e._id} to={`/events/${e._id}`} className="card hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <p className="font-medium">{e.title}</p>
              <span className="text-xs px-2 py-1 rounded bg-zinc-100">{e.status}</span>
            </div>
            <div className="mt-2 text-sm text-zinc-600">Venue: {e.venue}</div>
            <div className="text-sm text-zinc-600">Date: {new Date(e.date).toDateString()}</div>
            <div className="mt-3 flex items-center gap-4 text-xs text-zinc-700">
              <span>💵 LKR {e.price}</span>
              <span>🎟️ {e.seatMap.sold.length} sold</span>
              <span>🪑 {e.seatMap.rows * e.seatMap.cols - e.seatMap.sold.length - e.seatMap.reserved.length} left</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
