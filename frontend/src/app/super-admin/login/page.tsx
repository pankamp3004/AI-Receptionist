'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import superApi from '@/lib/super-api'
import { setSuperAuth } from '@/lib/super-auth'
import toast, { Toaster } from 'react-hot-toast'
import { ShieldAlert } from 'lucide-react'
import { getErrorMessage } from '@/lib/api'

export default function SuperAdminLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await superApi.post('/api/v1/super-admin/auth/login', { email, password })
      setSuperAuth(data)
      toast.success('Welcome back, global admin')
      router.push('/super-admin/dashboard')
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Login failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Toaster />
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden p-8 border border-gray-100">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-pink-50 rounded-full">
            <ShieldAlert className="h-12 w-12 text-pink-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Super Admin Control</h2>
        <p className="text-center text-gray-500 mb-8">Access the global master dashboard</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition"
              placeholder="admin@system.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? 'Authenticating...' : 'Secure Login'}
          </button>
        </form>
      </div>
    </div>
  )
}
