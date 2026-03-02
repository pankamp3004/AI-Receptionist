'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAuth, clearAuth, type AuthUser } from '@/lib/auth'

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const auth = getAuth()
    if (!auth) {
      // Redirect first, then flip loading so the layout never renders
      router.replace('/login')
    } else {
      setUser(auth)
      setLoading(false)
    }
  }, [router])

  const logout = () => {
    clearAuth()
    router.replace('/login')
  }

  return { user, loading, logout }
}
