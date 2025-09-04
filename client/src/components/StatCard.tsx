export default function StatCard({ title, value, hint, color = 'emerald' }: { title: string; value: string | number; hint?: string; color?: 'emerald' | 'sky' | 'violet' }) {
  const bg = color === 'emerald' ? 'bg-emerald-100 text-emerald-900' : color === 'sky' ? 'bg-sky-100 text-sky-900' : 'bg-violet-100 text-violet-900'
  return (
    <div className={`card ${bg}`}>
      <p className="text-sm opacity-70">{title}</p>
      <p className="text-3xl font-semibold">{value}</p>
      {hint && <p className="text-xs opacity-60 mt-1">{hint}</p>}
    </div>
  )
}
