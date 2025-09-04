export type Role = 'admin' | 'user'

export interface IUser { id: string; name: string; email: string; role: Role }

export interface IEvent {
  _id: string
  title: string
  date: string
  time?: string
  venue: string
  description?: string
  price: number
  tags?: string[]
  popularity?: 'Low' | 'Medium' | 'High' | 'Very High'
  seatMap: { rows: number; cols: number; reserved: string[]; sold: string[] }
  status: 'upcoming' | 'active' | 'closed'
}

export interface IBooking {
  _id: string
  event: IEvent
  seats: string[]
  pricePaid: number
  status: string
  qrData: string // data URL
}
