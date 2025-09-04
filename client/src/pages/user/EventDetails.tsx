import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import { IEvent } from '../../types'
import SeatGrid from '../../components/SeatGrid'

export default function EventDetails() {
  const { id } = useParams()
  const [event, setEvent] = useState<IEvent | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const nav = useNavigate()
  useEffect(() => { api.get(`/events/${id}`).then(r=>setEvent(r.data)) }, [id])
  const toggle = (s: string) => setSelected(prev => prev.includes(s) ? prev.filter(i=>i!==s) : [...prev, s])
  const book = async () => {
    await api.post(`/bookings/${id}`, { seats: selected })
    nav('/me/tickets')
  }
  if (!event) return <div>Loading...</div>
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="card">
        <h2 className="text-xl font-semibold">{event.title}</h2>
        <p className="text-sm text-zinc-500">{new Date(event.date).toDateString()} • {event.time}</p>
        <p className="mt-3">{event.description}</p>
        <p className="mt-2 font-medium">Venue: {event.venue}</p>
        <p className="">Price: LKR {event.price}</p>
      </div>
      <div className="card">
        <h3 className="font-semibold mb-2">Seat Allocation</h3>
        <SeatGrid rows={event.seatMap.rows} cols={event.seatMap.cols} sold={event.seatMap.sold} reserved={event.seatMap.reserved} selected={selected} onToggle={toggle} />
        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm text-zinc-600">Selected: {selected.length} • Total: LKR {selected.length * event.price}</div>
          <button className="btn" disabled={!selected.length} onClick={book}>Book</button>
        </div>
        <p className="mt-2 text-xs text-zinc-500">A QR code ticket will be generated after payment to speed up check-in.</p>
      </div>
    </div>
  )
}
