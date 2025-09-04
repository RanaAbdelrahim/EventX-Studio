import { useEffect, useState } from 'react'
import api from '../../utils/api'
import { IBooking } from '../../types'

export default function MyTickets() {
  const [items, setItems] = useState<IBooking[]>([])
  useEffect(() => { api.get('/bookings/me').then(r=>setItems(r.data)) }, [])
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {items.map(b => (
        <div key={b._id} className="card">
          <p className="font-medium">{b.event.title}</p>
          <p className="text-sm text-zinc-500">{new Date(b.event.date).toDateString()} • {b.event.venue}</p>
          <p className="mt-2 text-sm">Seats: {b.seats.join(', ')}</p>
          <p className="text-sm">Paid: LKR {b.pricePaid}</p>
          {b.qrData && <img src={b.qrData} className="mt-2 w-40 h-40" />}
        </div>
      ))}
    </div>
  )
}
