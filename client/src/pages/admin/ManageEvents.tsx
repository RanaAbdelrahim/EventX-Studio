import { useEffect, useState } from 'react'
import api from '../../utils/api'
import { IEvent } from '../../types'

export default function ManageEvents() {
  const [events, setEvents] = useState<IEvent[]>([])
  const [form, setForm] = useState<any>({ title: '', venue: '', date: '', time: '', price: 0, status: 'upcoming', seatMap: { rows: 8, cols: 12 } })
  const load = () => api.get('/events').then(r => setEvents(r.data))
  useEffect(() => { load() }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    await api.post('/events', form)
    setForm({ title: '', venue: '', date: '', time: '', price: 0, status: 'upcoming', seatMap: { rows: 8, cols: 12 } })
    load()
  }
  const del = async (id: string) => { await api.delete(`/events/${id}`); load() }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="card">
        <h2 className="font-semibold mb-4 text-lg">Event Details</h2>
        <form className="grid sm:grid-cols-2 gap-2" onSubmit={save}>
          <input className="input" placeholder="Title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} />
          <input className="input" placeholder="Venue" value={form.venue} onChange={e=>setForm({...form,venue:e.target.value})} />
          <input className="input" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} />
          <input className="input" placeholder="Time" value={form.time} onChange={e=>setForm({...form,time:e.target.value})} />
          <input className="input" type="number" placeholder="Price" value={form.price} onChange={e=>setForm({...form,price:Number(e.target.value)})} />
          <select className="input" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
            <option value="upcoming">Upcoming</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
          </select>
          <input className="input" type="number" placeholder="Rows" value={form.seatMap.rows} onChange={e=>setForm({...form,seatMap:{...form.seatMap, rows:Number(e.target.value)}})} />
          <input className="input" type="number" placeholder="Cols" value={form.seatMap.cols} onChange={e=>setForm({...form,seatMap:{...form.seatMap, cols:Number(e.target.value)}})} />
          <button className="btn sm:col-span-2 mt-2">Save</button>
        </form>
      </div>
      <div className="space-y-3">
        {events.map(e => (
          <div key={e._id} className="card flex items-center justify-between">
            <div>
              <p className="font-medium">{e.title}</p>
              <p className="text-sm text-zinc-500">{new Date(e.date).toDateString()} • {e.venue} • LKR {e.price}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-1 rounded bg-zinc-100">{e.status}</span>
              <button className="btn !bg-red-600" onClick={()=>del(e._id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
