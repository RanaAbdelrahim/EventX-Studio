import React from 'react'

export default function SeatGrid({ rows, cols, sold = [], reserved = [], selected = [], onToggle }: { rows: number; cols: number; sold?: string[]; reserved?: string[]; selected?: string[]; onToggle: (id: string) => void }) {
  const cells = []
  for (let r = 1; r <= rows; r++) {
    const row = []
    for (let c = 1; c <= cols; c++) {
      const id = `R${r}C${c}`
      const isSold = sold.includes(id)
      const isReserved = reserved.includes(id)
      const isSel = selected.includes(id)
      row.push(
        <button key={id} disabled={isSold || isReserved} onClick={() => onToggle(id)} className={`w-7 h-7 rounded ${isSold ? 'bg-purple-600' : isReserved ? 'bg-zinc-300' : isSel ? 'bg-emerald-400' : 'bg-zinc-200'} hover:opacity-80`}></button>
      )
    }
    cells.push(<div key={r} className="flex gap-1">{row}</div>)
  }
  return <div className="flex flex-col gap-1">{cells}</div>
}
