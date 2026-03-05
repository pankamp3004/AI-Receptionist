import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = sessionStorage.getItem('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      sessionStorage.clear()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

/**
 * Safely extract a human-readable error message from any FastAPI/axios error.
 * Handles:
 *  - Pydantic v2 validation errors: detail is [{type, loc, msg, input}, ...]
 *  - Simple string details: detail is "some message"
 *  - Network errors with no response
 */
export function getErrorMessage(e: unknown, fallback = 'Something went wrong'): string {
  if (!e || typeof e !== 'object') return fallback
  const err = e as any
  const detail = err?.response?.data?.detail
  if (!detail) return err?.message || fallback
  // Pydantic v2: array of error objects
  if (Array.isArray(detail)) {
    return detail
      .map((d: any) => {
        if (typeof d === 'string') return d
        const loc = Array.isArray(d.loc) ? d.loc.filter((l: any) => l !== 'body').join(' → ') : ''
        const msg = d.msg || d.message || String(d)
        return loc ? `${loc}: ${msg}` : msg
      })
      .join('; ')
  }
  // Simple string
  if (typeof detail === 'string') return detail
  return fallback
}

export default api
