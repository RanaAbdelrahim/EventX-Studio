import { useEffect, useState } from 'react'
import api from '../../utils/api'
import StatCard from '../../components/StatCard'

export default function Dashboard() {
  const [data, setData] = useState<any>()
  useEffect(() => { api.get('/analytics/overview').then(r=>setData(r.data)) }, [])
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-4">
        <StatCard title="Events" value={data?.totalEvents ?? '—'} hint="Total events" color="sky" />
        <StatCard title="Bookings" value={data?.ticketsSold ?? '—'} hint="Tickets sold" color="violet" />
        <StatCard title="Revenue" value={`LKR ${data?.totalRevenue ?? '—'}`} hint="All time" color="emerald" />
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold">Net Sales</p>
            <a className="btn !px-3 !py-1 text-sm" href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/analytics/export`} target="_blank" rel="noreferrer">Export to Excel</a>
          </div>
          <div className="h-48 bg-gradient-to-b from-zinc-50 to-zinc-100 rounded"></div>
        </div>
        <div className="card">
          <p className="font-semibold mb-2">Customer Engagement</p>
          <div className="mx-auto rounded-full w-40 h-40 border-[18px] border-emerald-300 border-t-violet-400 border-r-sky-300" />
        </div>
      </div>
    </div>
  )
}
