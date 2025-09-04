import { useState, useEffect } from 'react'
import { useAuth } from '../state/AuthContext'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import api from '../utils/api'

export default function Login() {
  const [email, setEmail] = useState('admin@eventx.dev')
  const [password, setPassword] = useState('Admin123!')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingServer, setCheckingServer] = useState(true)
  const [serverOnline, setServerOnline] = useState(true)
  const [serverStatusDetails, setServerStatusDetails] = useState('')
  const { login, error: authError, clearError } = useAuth()
  const nav = useNavigate()
  const location = useLocation()

  // Check if server is online
  useEffect(() => {
    const checkServer = async () => {
      try {
        setCheckingServer(true)
        // Simple ping to check if server is running
        await api.get('/auth/ping')
        setServerOnline(true)
        setServerStatusDetails('')
      } catch (err: any) {
        console.error('Server check failed:', err)
        setServerOnline(false)
        
        // Provide specific error details for troubleshooting
        if (err.message.includes('Network Error')) {
          setServerStatusDetails(`Network error: The API server at ${import.meta.env.VITE_API_URL || 'default URL'} is not responding.`)
        } else {
          setServerStatusDetails(err.message || 'Unknown error connecting to server')
        }
        
        setError('Server appears to be offline. Please make sure the backend server is running.')
      } finally {
        setCheckingServer(false)
      }
    }
    
    checkServer()
  }, [])

  // Check for expired session query param
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('expired') === 'true') {
      setError('Your session has expired. Please login again.')
    }
    
    // Clear any auth context errors on component mount
    return () => clearError()
  }, [location, clearError])

  // Show auth context errors
  useEffect(() => {
    if (authError) {
      setError(authError)
    }
  }, [authError])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try { 
      await login(email, password)
      nav('/') 
    } catch (e: any) { 
      console.error('Login error:', e)
      setError(e?.message || 'Login failed. Please check your credentials.') 
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyAdmin = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await api.get('/debug/check-admin')
      if (response.data.exists) {
        setError(`Admin account verified! Email: ${response.data.email}`)
      } else {
        setError('Admin account does not exist. Try running the seed script.')
      }
    } catch (err) {
      setError('Failed to verify admin account. Is the server running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10 card">
      <h1 className="text-2xl font-semibold mb-4">Login</h1>
      
      {!serverOnline && !checkingServer && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4">
          <p className="font-medium">Server appears to be offline!</p>
          <p className="text-sm mt-1">Please ensure the backend server is running on {import.meta.env.VITE_API_URL || 'the configured URL'}</p>
          {serverStatusDetails && (
            <p className="text-sm mt-1 text-red-600">{serverStatusDetails}</p>
          )}
          <p className="text-sm mt-1">Try running these commands in the server directory:</p>
          <pre className="bg-red-100 p-2 rounded text-xs mt-1 overflow-x-auto">
            cd server
            npm install
            npm run dev
          </pre>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4">
          {error}
        </div>
      )}
      
      <form className="space-y-3" onSubmit={onSubmit}>
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input 
            className="input" 
            placeholder="Email" 
            value={email} 
            onChange={e=>setEmail(e.target.value)} 
            required
          />
        </div>
        
        <div>
          <label className="block text-sm mb-1">Password</label>
          <input 
            className="input" 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={e=>setPassword(e.target.value)} 
            required
          />
        </div>
        
        <button 
          className="btn w-full flex justify-center" 
          disabled={loading || !serverOnline}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      
      <div className="mt-4">
        <button 
          onClick={handleVerifyAdmin}
          className="text-sm text-blue-600 hover:underline"
          disabled={loading || !serverOnline}
        >
          Verify Admin Account Exists
        </button>
      </div>
      
      <p className="mt-3 text-sm text-zinc-500">
        No account? <Link className="underline" to="/register">Register</Link>
      </p>
    </div>
  )
}
