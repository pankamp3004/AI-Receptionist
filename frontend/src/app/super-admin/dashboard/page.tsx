'use client'
import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import superApi from '@/lib/super-api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Building2, Phone, Users, Stethoscope } from 'lucide-react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  Cell, ScatterChart, Scatter, ZAxis, Label, Legend
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
  total_cost: number
  total_duration_seconds: number
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
          <p className="text-sm font-medium text-gray-500 dark:text-slate-400">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
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

  // Build a STABLE color map: same hospital always gets the same color across ALL charts
  const hospitalColorMap = useMemo(() => {
    const map: Record<string, string> = {}
    hospitalStats?.forEach((h, i) => {
      map[h.id] = COLORS[i % COLORS.length]
    })
    return map
  }, [hospitalStats])

  if (statsLoading || chartsLoading) return <LoadingSpinner />

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Global Overview</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1">System-wide metrics across all tenants.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatBox title="Total Tenants (Hospitals)" value={stats?.total_organizations ?? 0} icon={Building2} colorClass="bg-indigo-600" />
        <StatBox title="Global Calls Processed" value={stats?.total_calls_handled ?? 0} icon={Phone} colorClass="bg-pink-600" />
        <StatBox title="System Patients" value={stats?.total_patients_systemwide ?? 0} icon={Users} colorClass="bg-blue-500" />
        <StatBox title="System Doctors" value={stats?.total_doctors_systemwide ?? 0} icon={Stethoscope} colorClass="bg-emerald-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Patient Distribution Bar Chart */}
        <Card className="shadow-sm border-gray-200 dark:border-slate-800 transition-colors">
           <CardHeader className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30 pb-4 transition-colors">
               <CardTitle className="text-gray-800 dark:text-slate-100 text-lg">Patient Volume by Hospital</CardTitle>
           </CardHeader>
           <CardContent className="pt-6">
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hospitalStats} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:opacity-20" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                    <RechartsTooltip 
                      cursor={{fill: 'rgba(156, 163, 175, 0.1)'}}
                      contentStyle={{borderRadius: '8px', border: '1px solid rgba(226, 232, 240, 0.5)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                      itemStyle={{ color: '#475569' }}
                      labelStyle={{ color: '#1E293B', fontWeight: 600 }}
                    />
                    <Bar dataKey="patients" name="Patients" radius={[4, 4, 0, 0]} barSize={40}>
                      {hospitalStats?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={hospitalColorMap[entry.id] ?? COLORS[0]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
           </CardContent>
        </Card>

        {/* Doctor Distribution Bar Chart */}
        <Card className="shadow-sm border-gray-200 dark:border-slate-800 transition-colors">
           <CardHeader className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30 pb-4 transition-colors">
               <CardTitle className="text-gray-800 dark:text-slate-100 text-lg">Doctors by Hospital</CardTitle>
           </CardHeader>
           <CardContent className="pt-6">
               <div className="h-[350px] w-full">
                 {hospitalStats?.some(h => h.doctors > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hospitalStats} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:opacity-20" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                      <RechartsTooltip 
                        cursor={{fill: 'rgba(156, 163, 175, 0.1)'}}
                        contentStyle={{borderRadius: '8px', border: '1px solid rgba(226, 232, 240, 0.5)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                        itemStyle={{ color: '#475569' }}
                        labelStyle={{ color: '#1E293B', fontWeight: 600 }}
                      />
                      <Bar dataKey="doctors" name="Doctors" radius={[4, 4, 0, 0]} barSize={50}>
                        {hospitalStats?.map((entry, index) => (
                          <Cell key={`doc-cell-${index}`} fill={hospitalColorMap[entry.id] ?? COLORS[0]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                 ) : (
                    <div className="text-gray-400 text-sm flex flex-col items-center justify-center h-full">
                       <Stethoscope className="w-12 h-12 text-gray-200 mb-2" />
                       No doctors registered system-wide yet.
                    </div>
                 )}
               </div>
           </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* Call Volume Distribution Bar Chart */}
        <Card className="shadow-sm border-gray-200 dark:border-slate-800 transition-colors">
           <CardHeader className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30 pb-4 transition-colors">
               <CardTitle className="text-gray-800 dark:text-slate-100 text-lg">Call Volume by Hospital</CardTitle>
           </CardHeader>
           <CardContent className="pt-6">
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hospitalStats} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:opacity-20" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                    <RechartsTooltip 
                      cursor={{fill: 'rgba(156, 163, 175, 0.1)'}}
                      contentStyle={{borderRadius: '8px', border: '1px solid rgba(226, 232, 240, 0.5)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                      itemStyle={{ color: '#475569' }}
                      labelStyle={{ color: '#1E293B', fontWeight: 600 }}
                    />
                    <Bar dataKey="calls" name="Calls Processed" radius={[4, 4, 0, 0]} barSize={50}>
                      {hospitalStats?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={hospitalColorMap[entry.id] ?? COLORS[0]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
           </CardContent>
        </Card>

        {/* Total Duration by Hospital Bar Chart */}
        <Card className="shadow-sm border-gray-200 dark:border-slate-800 transition-colors">
           <CardHeader className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30 pb-4 transition-colors">
               <CardTitle className="text-gray-800 dark:text-slate-100 text-lg">Total Duration by Hospital</CardTitle>
           </CardHeader>
           <CardContent className="pt-6">
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={hospitalStats?.map(h => ({ ...h, duration_minutes: Math.round((h.total_duration_seconds ?? 0) / 60) }))} 
                    margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:opacity-20" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} tickFormatter={(v) => `${v}m`} />
                    <RechartsTooltip 
                      cursor={{fill: 'rgba(156, 163, 175, 0.1)'}}
                      contentStyle={{borderRadius: '8px', border: '1px solid rgba(226, 232, 240, 0.5)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                      itemStyle={{ color: '#475569' }}
                      labelStyle={{ color: '#1E293B', fontWeight: 600 }}
                      formatter={(value: any) => [`${value} min`, 'Total Duration']}
                    />
                    <Bar dataKey="duration_minutes" name="Total Duration" radius={[4, 4, 0, 0]} barSize={50} fillOpacity={0.8}>
                      {hospitalStats?.map((entry, index) => (
                        <Cell key={`dur-cell-${index}`} fill={hospitalColorMap[entry.id] ?? COLORS[0]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
           </CardContent>
        </Card>

        {/* Total Cost by Hospital Horizontal Bar Chart */}
        <Card className="shadow-sm border-gray-200 dark:border-slate-800 transition-colors">
           <CardHeader className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30 pb-4 transition-colors">
               <CardTitle className="text-gray-800 dark:text-slate-100 text-lg">Total Cost by Hospital (USD)</CardTitle>
           </CardHeader>
           <CardContent className="pt-6">
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hospitalStats} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" className="dark:opacity-20" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} tickFormatter={(val) => `$${val}`} />
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} width={120} />
                    <RechartsTooltip 
                      cursor={{fill: 'rgba(156, 163, 175, 0.1)', opacity: 0.1}}
                      contentStyle={{borderRadius: '8px', border: '1px solid rgba(226, 232, 240, 0.5)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                      itemStyle={{ color: '#475569' }}
                      labelStyle={{ color: '#1E293B', fontWeight: 600 }}
                      formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Total Cost']}
                    />
                    <Bar dataKey="total_cost" name="Total Cost" radius={[0, 4, 4, 0]} barSize={30}>
                      {hospitalStats?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={hospitalColorMap[entry.id] ?? COLORS[0]} />
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
