'use client'
import { ReactNode } from 'react'
import Sidebar from './Sidebar'
import { useAuth } from '@/hooks/useAuth'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { loading } = useAuth()

  if (loading) return <LoadingSpinner size="lg" />

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="ml-64 min-h-screen">
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
