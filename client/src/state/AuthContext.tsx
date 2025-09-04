import React, { createContext, useContext, useEffect, useState } from 'react'
import { IUser } from '../types'
import api from '../utils/api'

type AuthState = { 
  user: IUser | null; 
  token: string | null; 
  loading: boolean; 
  error: string | null;
  login: (e: string, p: string) => Promise<void>; 
  register: (d: any) => Promise<void>; 
  logout: () => void;
  clearError: () => void;
}

const Ctx = createContext<AuthState>({} as any)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const clearError = () => setError(null)

  useEffect(() => {
    async function fetchMe() {
      if (!token) { 
        setLoading(false)
        return 
      }
      
      try {
        const res = await api.get('/auth/me')
        setUser(res.data.user)
      } catch (err: any) {
        console.error('Auth check failed:', err.message)
        setToken(null)
        localStorage.removeItem('token')
        setError('Authentication failed. Please log in again.')
      } finally { 
        setLoading(false) 
      }
    }
    
    fetchMe()
  }, [token])

  const login = async (email: string, password: string) => {
    setLoading(true)
    clearError()
    
    try {
      const res = await api.post('/auth/login', { email, password })
      setToken(res.data.token)
      localStorage.setItem('token', res.data.token)
      setUser(res.data.user)
    } catch (err: any) {
      const message = err.response?.data?.message || 'Login failed'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }
  
  const register = async (data: any) => {
    setLoading(true)
    clearError()
    
    try {
      const res = await api.post('/auth/register', data)
      setToken(res.data.token)
      localStorage.setItem('token', res.data.token)
      setUser(res.data.user)
    } catch (err: any) {
      const message = err.response?.data?.message || 'Registration failed'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }
  
  const logout = () => { 
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
  }

  return (
    <Ctx.Provider value={{ 
      user, 
      token, 
      loading, 
      error,
      login, 
      register, 
      logout,
      clearError
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
