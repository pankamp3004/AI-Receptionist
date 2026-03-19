import axios from 'axios'
import { getSuperAuth, clearSuperAuth } from '@/lib/super-auth'

const superApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
})

superApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const auth = getSuperAuth()
    if (auth?.access_token) {
      config.headers.Authorization = `Bearer ${auth.access_token}`
    }
  }
  return config
})

superApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      clearSuperAuth()
      window.location.href = '/super-admin/login'
    }
    return Promise.reject(err)
  }
)

export default superApi
