'use client'
import { useQuery } from '@tanstack/react-query'
import superApi from '@/lib/super-api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Building2, Phone, Users, Stethoscope } from 'lucide-react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts'

interface GlobalStats {
  total_organizations: number
  total_calls_handled: number
  total_patients_systemwide: number
  total_doctors_systemwide: number
}

interface HospitalStat {
  id: string
  name: string
  patients: number
  doctors: number
  calls: number
}

const COLORS = ['#4f46e5', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6']

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
  const { data: stats, isLoading: statsLoading } = useQuery<GlobalStats>({
    queryKey: ['super-dashboard-stats'],
    queryFn: async () => (await superApi.get('/api/v1/super-admin/dashboard/stats')).data,
  })

  const { data: hospitalStats, isLoading: chartsLoading } = useQuery<HospitalStat[]>({
    queryKey: ['super-dashboard-hospital-stats'],
    queryFn: async () => (await superApi.get('/api/v1/super-admin/dashboard/hospital-stats')).data,
  })

  if (statsLoading || chartsLoading) return <LoadingSpinner />

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Global Overview</h1>
        <p className="text-gray-500 mt-1">System-wide metrics across all tenants.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatBox title="Total Tenants (Hospitals)" value={stats?.total_organizations ?? 0} icon={Building2} colorClass="bg-indigo-600" />
        <StatBox title="Global Calls Processed" value={stats?.total_calls_handled ?? 0} icon={Phone} colorClass="bg-pink-600" />
        <StatBox title="System Patients" value={stats?.total_patients_systemwide ?? 0} icon={Users} colorClass="bg-blue-500" />
        <StatBox title="System Doctors" value={stats?.total_doctors_systemwide ?? 0} icon={Stethoscope} colorClass="bg-emerald-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Patient Distribution Bar Chart */}
        <Card className="shadow-sm border-gray-200">
           <CardHeader className="border-b border-gray-100 bg-gray-50/50 pb-4">
               <CardTitle className="text-gray-800 text-lg">Patient Volume by Hospital</CardTitle>
           </CardHeader>
           <CardContent className="pt-6">
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hospitalStats} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
                    <RechartsTooltip 
                      cursor={{fill: '#F3F4F6'}}
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    />
                    <Bar dataKey="patients" name="Patients" radius={[4, 4, 0, 0]} barSize={40}>
                      {hospitalStats?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
           </CardContent>
        </Card>

        {/* Doctor Distribution Pie Chart */}
        <Card className="shadow-sm border-gray-200">
           <CardHeader className="border-b border-gray-100 bg-gray-50/50 pb-4">
               <CardTitle className="text-gray-800 text-lg">Platform Doctor Distribution</CardTitle>
           </CardHeader>
           <CardContent className="pt-6">
               <div className="h-[350px] w-full flex items-center justify-center">
                 {hospitalStats?.some(h => h.doctors > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={hospitalStats}
                        cx="50%"
                        cy="45%"
                        innerRadius={80}
                        outerRadius={120}
                        paddingAngle={2}
                        dataKey="doctors"
                        nameKey="name"
                      >
                        {hospitalStats?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                 ) : (
                    <div className="text-gray-400 text-sm flex flex-col items-center">
                       <Stethoscope className="w-12 h-12 text-gray-200 mb-2" />
                       No doctors registered system-wide yet.
                    </div>
                 )}
               </div>
           </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        {/* Call Volume Distribution Bar Chart */}
        <Card className="shadow-sm border-gray-200">
           <CardHeader className="border-b border-gray-100 bg-gray-50/50 pb-4">
               <CardTitle className="text-gray-800 text-lg">Call Volume by Hospital</CardTitle>
           </CardHeader>
           <CardContent className="pt-6">
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hospitalStats} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
                    <RechartsTooltip 
                      cursor={{fill: '#F3F4F6'}}
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    />
                    <Bar dataKey="calls" name="Calls Processed" radius={[4, 4, 0, 0]} barSize={50}>
                      {hospitalStats?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
           </CardContent>
        </Card>
      </div>
    </div>
  )
}
