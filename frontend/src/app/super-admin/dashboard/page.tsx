'use client'
import { useQuery } from '@tanstack/react-query'
import superApi from '@/lib/super-api'
import { Card, CardContent } from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Building2, Phone, Users, Stethoscope } from 'lucide-react'

interface GlobalStats {
  total_organizations: number
  total_calls_handled: number
  total_patients_systemwide: number
  total_doctors_systemwide: number
}

function StatBox({ title, value, icon: Icon, colorClass }: { title: string, value: number, icon: any, colorClass: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-6">
        <div className={`rounded-xl p-4 ${colorClass}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function SuperDashboard() {
  const { data: stats, isLoading } = useQuery<GlobalStats>({
    queryKey: ['super-dashboard-stats'],
    queryFn: async () => (await superApi.get('/api/v1/super-admin/dashboard/stats')).data,
  })

  if (isLoading) return <LoadingSpinner />

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Global Overview</h1>
        <p className="text-gray-500 mt-1">System-wide metrics across all tenants.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatBox title="Total Tenants (Hospitals)" value={stats?.total_organizations ?? 0} icon={Building2} colorClass="bg-indigo-600" />
        <StatBox title="Global Calls Processed" value={stats?.total_calls_handled ?? 0} icon={Phone} colorClass="bg-pink-600" />
        <StatBox title="System Patients" value={stats?.total_patients_systemwide ?? 0} icon={Users} colorClass="bg-blue-500" />
        <StatBox title="System Doctors" value={stats?.total_doctors_systemwide ?? 0} icon={Stethoscope} colorClass="bg-emerald-500" />
      </div>
    </div>
  )
}
