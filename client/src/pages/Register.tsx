import { useState } from 'react'
import { useAuth } from '../state/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const { register } = useAuth()
  const nav = useNavigate()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await register(form)
    nav('/')
  }

  return (
    <div className="max-w-md mx-auto mt-10 card">
      <h1 className="text-2xl font-semibold mb-4">Create Account</h1>
      <form className="space-y-3" onSubmit={onSubmit}>
        <input className="input" placeholder="Name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
        <input className="input" placeholder="Email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} />
        <input className="input" type="password" placeholder="Password" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} />
        <button className="btn w-full">Register</button>
      </form>
    </div>
  )
}
