'use client'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { DashboardStats } from '@/types'
import { Card, CardContent } from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Stethoscope, Users, CalendarCheck, Phone, Calendar, XCircle } from 'lucide-react'

function StatCard({ title, value, icon: Icon, color }: {
  title: string; value: number; icon: any; color: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-5">
        <div className={`rounded-xl p-3 ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => (await api.get('/api/v1/dashboard/stats')).data,
  })

  if (isLoading) return <LoadingSpinner />

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back! Here&apos;s an overview of your organization.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5 mb-5">
        <StatCard title="Total Doctors" value={stats?.total_doctors ?? 0} icon={Stethoscope} color="bg-blue-600" />
        <StatCard title="Total Patients" value={stats?.total_patients ?? 0} icon={Users} color="bg-purple-600" />
        <StatCard title="Total Appointments" value={stats?.total_appointments ?? 0} icon={CalendarCheck} color="bg-green-600" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard title="AI Calls Handled" value={stats?.total_calls ?? 0} icon={Phone} color="bg-pink-600" />
        <StatCard title="Scheduled" value={stats?.scheduled_appointments ?? 0} icon={Calendar} color="bg-orange-500" />
        <StatCard title="Cancelled" value={stats?.cancelled_appointments ?? 0} icon={XCircle} color="bg-red-500" />
      </div>
    </div>
  )
}
