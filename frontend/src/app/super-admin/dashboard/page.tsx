'use client'
import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import superApi from '@/lib/super-api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Activity, Building2, Phone, Sparkles, Stethoscope, Users } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
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

const COLORS = ['#6D5EF8', '#FF4FA3', '#22C55E', '#F59E0B', '#3B82F6', '#9B5CF6', '#F97316', '#14B8A6']

const tooltipStyle = {
  borderRadius: '18px',
  border: '1px solid rgba(148, 163, 184, 0.18)',
  background: 'rgba(15, 23, 42, 0.96)',
  boxShadow: '0 20px 45px rgba(2, 6, 23, 0.35)',
  backdropFilter: 'blur(12px)',
}

const axisTickStyle = {
  fill: 'var(--super-chart-axis)',
  fontSize: 12,
  fontWeight: 500,
}

const axisTickStyleStrong = {
  fill: 'var(--super-chart-axis)',
  fontSize: 12,
  fontWeight: 600,
}

function formatMinutes(seconds: number) {
  return Math.round((seconds ?? 0) / 60)
}

function StatBox({
  title,
  value,
  icon: Icon,
  accentClass,
  helper,
}: {
  title: string
  value: number
  icon: any
  accentClass: string
  helper: string
}) {
  return (
    <Card className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-white/75 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur dark:bg-slate-900/75 dark:shadow-[0_24px_80px_rgba(2,6,23,0.45)]">
      <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/30" />
      <CardContent className="relative flex items-start justify-between gap-4 p-6">
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{title}</p>
            <p className="text-4xl font-black tracking-tight text-slate-950 dark:text-white">{value}</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{helper}</span>
          </div>
        </div>
        <div className={`rounded-[22px] p-4 text-white shadow-lg shadow-slate-900/10 transition-transform duration-300 group-hover:-translate-y-1 ${accentClass}`}>
          <Icon className="h-7 w-7" />
        </div>
      </CardContent>
    </Card>
  )
}

function ChartShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/70 shadow-[0_24px_80px_rgba(15,23,42,0.1)] backdrop-blur dark:bg-slate-900/72 dark:shadow-[0_28px_90px_rgba(2,6,23,0.45)]">
      <CardHeader className="border-b border-slate-200/70 bg-gradient-to-r from-white/70 via-white/45 to-white/20 pb-5 dark:border-white/10 dark:from-slate-900/80 dark:via-slate-900/50 dark:to-slate-900/20">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">{title}</CardTitle>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
          </div>
          <div className="rounded-full border border-slate-200/70 bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
            Live
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">{children}</CardContent>
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

  const hospitalColorMap = useMemo(() => {
    const map: Record<string, string> = {}
    hospitalStats?.forEach((h, i) => {
      map[h.id] = COLORS[i % COLORS.length]
    })
    return map
  }, [hospitalStats])

  const durationData = useMemo(
    () => hospitalStats?.map((h) => ({ ...h, duration_minutes: formatMinutes(h.total_duration_seconds ?? 0) })) ?? [],
    [hospitalStats]
  )

  const topHospital = useMemo(() => {
    if (!hospitalStats?.length) return 'No hospitals yet'
    return [...hospitalStats].sort((a, b) => b.calls - a.calls)[0]?.name ?? 'No hospitals yet'
  }, [hospitalStats])

  if (statsLoading || chartsLoading) return <LoadingSpinner />

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(109,94,248,0.2),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(255,79,163,0.18),_transparent_28%),linear-gradient(135deg,_rgba(255,255,255,0.92),_rgba(241,245,249,0.84))] p-7 shadow-[0_30px_120px_rgba(15,23,42,0.12)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(109,94,248,0.28),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(255,79,163,0.24),_transparent_28%),linear-gradient(135deg,_rgba(15,23,42,0.96),_rgba(2,6,23,0.92))] dark:shadow-[0_36px_120px_rgba(2,6,23,0.55)]">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.28),_transparent_60%)] lg:block dark:bg-[radial-gradient(circle_at_center,_rgba(99,102,241,0.16),_transparent_65%)]" />
        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)] xl:items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              <Activity className="h-4 w-4" />
              System Command Center
            </div>
            <div className="space-y-2">
              <h1 className="max-w-3xl text-3xl font-black tracking-tight text-slate-950 dark:text-white md:text-4xl">
                Global overview with a cleaner, executive-friendly control surface.
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300 md:text-base">
                Monitor tenant growth, patient activity, staffing, and call performance across the entire platform from one place.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-[26px] border border-white/20 bg-white/75 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Most Active Tenant</p>
              <p className="mt-3 text-xl font-bold text-slate-950 dark:text-white">{topHospital}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Highest call volume across all hospitals.</p>
            </div>
            <div className="rounded-[26px] border border-white/20 bg-white/75 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Network Size</p>
              <p className="mt-3 text-xl font-bold text-slate-950 dark:text-white">{stats?.total_organizations ?? 0} hospitals</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Live tenant footprint on the platform.</p>
            </div>
            <div className="rounded-[26px] border border-white/20 bg-white/75 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Total Reach</p>
              <p className="mt-3 text-xl font-bold text-slate-950 dark:text-white">{stats?.total_patients_systemwide ?? 0} patients</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Tracked across all connected hospitals.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatBox
          title="Total Tenants"
          value={stats?.total_organizations ?? 0}
          icon={Building2}
          accentClass="bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500"
          helper="Platform footprint"
        />
        <StatBox
          title="Global Calls"
          value={stats?.total_calls_handled ?? 0}
          icon={Phone}
          accentClass="bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400"
          helper="All-time call activity"
        />
        <StatBox
          title="System Patients"
          value={stats?.total_patients_systemwide ?? 0}
          icon={Users}
          accentClass="bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-500"
          helper="Cross-tenant patient base"
        />
        <StatBox
          title="System Doctors"
          value={stats?.total_doctors_systemwide ?? 0}
          icon={Stethoscope}
          accentClass="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500"
          helper="Active doctor records"
        />
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <ChartShell title="Patient Volume by Hospital" subtitle="Compare registered patient load across every tenant.">
          <div className="h-[360px] w-full rounded-[24px] bg-slate-50/55 p-3 ring-1 ring-slate-200/70 dark:bg-slate-950/35 dark:ring-white/10">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hospitalStats} margin={{ top: 16, right: 16, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--super-chart-grid)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={axisTickStyleStrong} />
                <YAxis axisLine={false} tickLine={false} tick={axisTickStyle} />
                <RechartsTooltip
                  cursor={{ fill: 'rgba(99, 102, 241, 0.10)' }}
                  contentStyle={tooltipStyle}
                  itemStyle={{ color: '#CBD5E1' }}
                  labelStyle={{ color: '#FFFFFF', fontWeight: 700 }}
                />
                <Bar dataKey="patients" name="Patients" radius={[10, 10, 0, 0]} barSize={42}>
                  {hospitalStats?.map((entry, index) => (
                    <Cell key={`patients-${index}`} fill={hospitalColorMap[entry.id] ?? COLORS[0]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartShell>

        <ChartShell title="Doctors by Hospital" subtitle="Staffing strength distribution across the tenant network.">
          <div className="h-[360px] w-full rounded-[24px] bg-slate-50/55 p-3 ring-1 ring-slate-200/70 dark:bg-slate-950/35 dark:ring-white/10">
            {hospitalStats?.some((h) => h.doctors > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hospitalStats} margin={{ top: 16, right: 16, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--super-chart-grid)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={axisTickStyleStrong} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={axisTickStyle} />
                  <RechartsTooltip
                    cursor={{ fill: 'rgba(99, 102, 241, 0.10)' }}
                    contentStyle={tooltipStyle}
                    itemStyle={{ color: '#CBD5E1' }}
                    labelStyle={{ color: '#FFFFFF', fontWeight: 700 }}
                  />
                  <Bar dataKey="doctors" name="Doctors" radius={[10, 10, 0, 0]} barSize={42}>
                    {hospitalStats?.map((entry, index) => (
                      <Cell key={`doctors-${index}`} fill={hospitalColorMap[entry.id] ?? COLORS[0]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 text-center dark:border-white/10 dark:bg-white/5">
                <Stethoscope className="mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
                <p className="text-base font-semibold text-slate-700 dark:text-slate-200">No doctors registered yet</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Doctor metrics will appear here once data is available.</p>
              </div>
            )}
          </div>
        </ChartShell>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <ChartShell title="Call Volume by Hospital" subtitle="Call handling activity across the platform.">
          <div className="h-[400px] w-full rounded-[24px] bg-slate-50/55 p-3 ring-1 ring-slate-200/70 dark:bg-slate-950/35 dark:ring-white/10">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hospitalStats} margin={{ top: 16, right: 16, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--super-chart-grid)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={axisTickStyleStrong} />
                <YAxis axisLine={false} tickLine={false} tick={axisTickStyle} />
                <RechartsTooltip
                  cursor={{ fill: 'rgba(99, 102, 241, 0.10)' }}
                  contentStyle={tooltipStyle}
                  itemStyle={{ color: '#CBD5E1' }}
                  labelStyle={{ color: '#FFFFFF', fontWeight: 700 }}
                />
                <Bar dataKey="calls" name="Calls Processed" radius={[10, 10, 0, 0]} barSize={44}>
                  {hospitalStats?.map((entry, index) => (
                    <Cell key={`calls-${index}`} fill={hospitalColorMap[entry.id] ?? COLORS[0]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartShell>

        <ChartShell title="Total Duration by Hospital" subtitle="Rounded call duration totals converted into minutes.">
          <div className="h-[400px] w-full rounded-[24px] bg-slate-50/55 p-3 ring-1 ring-slate-200/70 dark:bg-slate-950/35 dark:ring-white/10">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={durationData} margin={{ top: 16, right: 16, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--super-chart-grid)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={axisTickStyleStrong} />
                <YAxis axisLine={false} tickLine={false} tick={axisTickStyle} tickFormatter={(v) => `${v}m`} />
                <RechartsTooltip
                  cursor={{ fill: 'rgba(99, 102, 241, 0.10)' }}
                  contentStyle={tooltipStyle}
                  itemStyle={{ color: '#CBD5E1' }}
                  labelStyle={{ color: '#FFFFFF', fontWeight: 700 }}
                  formatter={(value: number) => [`${value} min`, 'Total Duration']}
                />
                <Bar dataKey="duration_minutes" name="Total Duration" radius={[10, 10, 0, 0]} barSize={44}>
                  {durationData.map((entry, index) => (
                    <Cell key={`duration-${index}`} fill={hospitalColorMap[entry.id] ?? COLORS[0]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartShell>

        <ChartShell title="Total Cost by Hospital" subtitle="Platform cost distribution by tenant in USD.">
          <div className="h-[400px] w-full rounded-[24px] bg-slate-50/55 p-3 ring-1 ring-slate-200/70 dark:bg-slate-950/35 dark:ring-white/10">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hospitalStats} layout="vertical" margin={{ top: 12, right: 16, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="var(--super-chart-grid)" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={axisTickStyle} tickFormatter={(val) => `$${val}`} />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={axisTickStyleStrong} width={132} />
                <RechartsTooltip
                  cursor={{ fill: 'rgba(99, 102, 241, 0.10)' }}
                  contentStyle={tooltipStyle}
                  itemStyle={{ color: '#CBD5E1' }}
                  labelStyle={{ color: '#FFFFFF', fontWeight: 700 }}
                  formatter={(value: number) => [`$${Number(value).toFixed(2)}`, 'Total Cost']}
                />
                <Bar dataKey="total_cost" name="Total Cost" radius={[0, 10, 10, 0]} barSize={26}>
                  {hospitalStats?.map((entry, index) => (
                    <Cell key={`cost-${index}`} fill={hospitalColorMap[entry.id] ?? COLORS[0]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartShell>
      </div>
    </div>
  )
}
