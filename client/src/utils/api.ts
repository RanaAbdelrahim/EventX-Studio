// utils/api.ts (or .js)
import axios from 'axios'

// Build a robust baseURL:
// - Use VITE_API_URL if provided
// - Trim trailing slashes
// - Append /api only if not already there
function buildBaseURL() {
  const raw = import.meta.env.VITE_API_URL?.trim()
  if (raw) {
    const noTrail = raw.replace(/\/+$/, '')
    return noTrail.endsWith('/api') ? noTrail : `${noTrail}/api`
  }
  // Fallback to relative /api (use Vite dev proxy or same-origin backend)
  return '/api'
}

const apiUrl = buildBaseURL()
console.log('API URL being used:', apiUrl)

const api = axios.create({
  baseURL: apiUrl,
  timeout: 15000,
})

// ---- Request interceptor (attach token safely in Axios v1) ----
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      // Axios v1 uses AxiosHeaders; support both shapes
      if (config.headers && typeof config.headers.set === 'function') {
        config.headers.set('Authorization', `Bearer ${token}`)
      } else {
        config.headers = {
          ...(config.headers || {}),
          Authorization: `Bearer ${token}`,
        }
      }
    }
    return config
  },
  (error) => {
    console.error('API Request Error:', error)
    return Promise.reject(error)
  }
)

// ---- Response interceptor (normalize errors & handle auth) ----
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Network / CORS / server down (no response object)
    if (!error.response) {
      console.error('Network Error:', error.message)
      console.log('API base URL:', apiUrl)
      console.log('Expected server at:', import.meta.env.VITE_API_URL || 'default URL')

      return Promise.reject(
        new Error(
          'Server appears to be offline or unreachable. Please ensure the backend is running and CORS/proxy is configured.'
        )
      )
    }

    const { status, data } = error.response

    // 401: handle token expiry or unauthenticated
    if (status === 401) {
      if (data?.code === 'AUTH_TOKEN_EXPIRED') {
        localStorage.removeItem('token')
        // Redirect once; avoid loops if already on /login
        if (!location.pathname.startsWith('/login')) {
          window.location.href = '/login?expired=true'
        }
        return Promise.reject(new Error('Your session has expired. Please log in again.'))
      }
      return Promise.reject(new Error(data?.message || 'Authentication failed'))
    }

    // Optional: treat 403 as not authorized
    if (status === 403) {
      return Promise.reject(new Error(data?.message || 'You do not have permission to perform this action'))
    }

    // Other API errors: surface server message if present
    const serverMsg =
      (typeof data === 'string' && data) ||
      data?.message ||
      (data?.error && (data.error.message || data.error)) ||
      `Request failed with status ${status}`

    console.error('API Response Error:', status, data)
    return Promise.reject(new Error(serverMsg))
  }
)

export default api
