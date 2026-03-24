'use client'
import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import superApi from '@/lib/super-api'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Card, CardContent } from '@/components/ui/Card'
import toast, { Toaster } from 'react-hot-toast'
import { Building2, Cpu, Settings2, ShieldAlert, Sparkles, Users, Zap } from 'lucide-react'

function MiniStat({
  label,
  value,
  helper,
  icon: Icon,
  accentClass,
}: {
  label: string
  value: string | number
  helper: string
  icon: any
  accentClass: string
}) {
  return (
    <Card className="overflow-hidden rounded-[26px] border border-white/10 bg-white/75 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur dark:bg-slate-900/75 dark:shadow-[0_24px_80px_rgba(2,6,23,0.45)]">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">{label}</p>
          <p className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">{value}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{helper}</p>
        </div>
        <div className={`rounded-[20px] p-3.5 text-white shadow-lg shadow-slate-900/10 ${accentClass}`}>
          <Icon className="h-6 w-6" />
        </div>
      </CardContent>
    </Card>
  )
}

function formatPlan(plan?: string) {
  return (plan || 'free').toUpperCase()
}

export default function TenantsPage() {
  const queryClient = useQueryClient()
  const { data: tenants, isLoading } = useQuery({
    queryKey: ['super-tenants-list'],
    queryFn: async () => (await superApi.get('/api/v1/super-admin/tenants')).data,
  })

  const [editingConfig, setEditingConfig] = useState<any>(null)
  const [provider, setProvider] = useState('openai')
  const [model, setModel] = useState('gpt-4o')
  const [subsUpdate, setSubsUpdate] = useState<any>(null)

  const modelMutation = useMutation({
    mutationFn: async ({ orgId, payload }: any) => {
      return await superApi.put(`/api/v1/super-admin/tenants/${orgId}/model-config`, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-tenants-list'] })
      toast.success('Model config updated')
      setEditingConfig(null)
    },
    onError: () => toast.error('Failed to update LLM configuration')
  })

  const subMutation = useMutation({
    mutationFn: async ({ orgId, payload }: any) => {
      return await superApi.put(`/api/v1/super-admin/tenants/${orgId}/subscription`, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-tenants-list'] })
      toast.success('Subscription limits updated')
      setSubsUpdate(null)
    },
    onError: () => toast.error('Failed to update subscription')
  })

  const summary = useMemo(() => {
    const rows = tenants ?? []
    const suspended = rows.filter((t: any) => t.subscription?.is_suspended).length
    const active = rows.length - suspended
    const totalAgents = rows.reduce((sum: number, t: any) => sum + (t.subscription?.max_agents || 1), 0)
    const providerMix = new Set(rows.map((t: any) => (t.llm_provider || 'openai').toUpperCase()))

    return {
      total: rows.length,
      active,
      suspended,
      totalAgents,
      providerCount: providerMix.size,
    }
  }, [tenants])

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-8">
      <Toaster />

      <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(168,85,247,0.18),_transparent_28%),linear-gradient(135deg,_rgba(255,255,255,0.94),_rgba(241,245,249,0.88))] p-7 shadow-[0_30px_120px_rgba(15,23,42,0.12)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.2),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(168,85,247,0.22),_transparent_28%),linear-gradient(135deg,_rgba(15,23,42,0.96),_rgba(2,6,23,0.92))] dark:shadow-[0_36px_120px_rgba(2,6,23,0.55)]">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.25),_transparent_60%)] lg:block dark:bg-[radial-gradient(circle_at_center,_rgba(99,102,241,0.14),_transparent_65%)]" />
        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] xl:items-center">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              <Sparkles className="h-4 w-4" />
              Tenant Control Center
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white md:text-4xl">Tenant Management</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300 md:text-base">
                Configure AI models, subscription limits, and account status for every registered hospital without touching the underlying workflows.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[24px] border border-white/20 bg-white/75 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Tenant Network</p>
              <p className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">{summary.total} hospitals</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{summary.active} active and {summary.suspended} suspended.</p>
            </div>
            <div className="rounded-[24px] border border-white/20 bg-white/75 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Provisioned Capacity</p>
              <p className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">{summary.totalAgents} agents</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{summary.providerCount} AI engine profiles currently in use.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MiniStat
          label="Total Tenants"
          value={summary.total}
          helper="Registered hospitals"
          icon={Building2}
          accentClass="bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500"
        />
        <MiniStat
          label="Active"
          value={summary.active}
          helper="Currently operational"
          icon={ShieldAlert}
          accentClass="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500"
        />
        <MiniStat
          label="Agent Limit"
          value={summary.totalAgents}
          helper="Total provisioned capacity"
          icon={Users}
          accentClass="bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-500"
        />
        <MiniStat
          label="AI Profiles"
          value={summary.providerCount}
          helper="Distinct providers in use"
          icon={Cpu}
          accentClass="bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400"
        />
      </div>

      <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/72 shadow-[0_24px_80px_rgba(15,23,42,0.1)] backdrop-blur dark:bg-slate-900/72 dark:shadow-[0_28px_90px_rgba(2,6,23,0.45)]">
        <div className="border-b border-slate-200/70 bg-gradient-to-r from-white/70 via-white/40 to-white/20 px-6 py-5 dark:border-white/10 dark:from-slate-900/80 dark:via-slate-900/50 dark:to-slate-900/20">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-950 dark:text-white">Tenant Registry</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Review contact details, plan status, AI engine configuration, and limits for each hospital.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              <Building2 className="h-4 w-4" />
              {summary.total} tenants loaded
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-slate-50/80 text-[11px] uppercase tracking-[0.24em] text-slate-500 dark:bg-slate-950/40 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4 font-semibold">Hospital</th>
                <th className="px-6 py-4 font-semibold">Contact</th>
                <th className="px-6 py-4 font-semibold">Plan & Agents</th>
                <th className="px-6 py-4 font-semibold">AI Engine</th>
                <th className="px-6 py-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants?.map((t: any) => (
                <tr key={t.organization.id} className="border-t border-slate-200/70 transition-colors hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-white/[0.03]">
                  <td className="px-6 py-5 align-top">
                    <div className="flex items-start gap-4">
                      <div className="mt-0.5 rounded-2xl bg-gradient-to-br from-indigo-500/15 via-violet-500/15 to-fuchsia-500/15 p-3 ring-1 ring-indigo-400/15 dark:bg-gradient-to-br dark:from-indigo-500/20 dark:via-violet-500/20 dark:to-fuchsia-500/20">
                        <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-slate-950 dark:text-white">{t.organization.name}</p>
                        <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">{t.organization.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 align-top">
                    <p className="text-base font-medium text-slate-800 dark:text-slate-100">{t.organization.email}</p>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t.organization.phone}</p>
                  </td>
                  <td className="px-6 py-5 align-top">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold tracking-[0.16em] ${
                      t.subscription?.is_suspended
                        ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                    }`}>
                      {t.subscription?.is_suspended ? 'SUSPENDED' : formatPlan(t.subscription?.plan_tier)}
                    </span>
                    <div className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                      <p>Agents: <span className="font-semibold">{t.subscription?.max_agents || 1}</span></p>
                      <p>API Calls: <span className="font-semibold">{t.subscription?.max_api_calls || 100}</span></p>
                    </div>
                  </td>
                  <td className="px-6 py-5 align-top">
                    <div className="inline-flex items-center gap-2 rounded-full border border-pink-200/70 bg-pink-50/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-pink-700 dark:border-pink-400/20 dark:bg-pink-500/10 dark:text-pink-300">
                      <Zap className="h-3.5 w-3.5" />
                      {t.llm_provider?.toUpperCase() || 'OPENAI'}
                    </div>
                    <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">{t.llm_model || 'gpt-4o'}</p>
                  </td>
                  <td className="px-6 py-5 align-top">
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                      <button
                        onClick={() => {
                          setEditingConfig(t.organization.id)
                          setProvider(t.llm_provider || 'openai')
                          setModel(t.llm_model || 'gpt-4o')
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl border border-indigo-200/70 bg-indigo-50/80 px-4 py-2 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-400/20 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/15"
                      >
                        <Settings2 className="h-4 w-4" />
                        AI Config
                      </button>
                      <button
                        onClick={() => {
                          setSubsUpdate({
                            id: t.organization.id,
                            plan_tier: t.subscription?.plan_tier || 'free',
                            max_agents: t.subscription?.max_agents || 1,
                            max_api_calls: t.subscription?.max_api_calls || 100,
                            is_suspended: t.subscription?.is_suspended || false
                          })
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl border border-pink-200/70 bg-pink-50/80 px-4 py-2 text-sm font-medium text-pink-700 transition-colors hover:bg-pink-100 dark:border-pink-400/20 dark:bg-pink-500/10 dark:text-pink-300 dark:hover:bg-pink-500/15"
                      >
                        <ShieldAlert className="h-4 w-4" />
                        Limits
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {tenants?.length === 0 && (
            <div className="p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400">
                <Building2 className="h-6 w-6" />
              </div>
              <p className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">No tenants registered yet</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Once hospitals are added, they will appear here with plan and AI settings.</p>
            </div>
          )}
        </div>
      </Card>

      {editingConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-lg rounded-[28px] border border-white/10 bg-white/92 shadow-[0_30px_100px_rgba(15,23,42,0.28)] dark:bg-slate-900/94">
            <CardContent className="p-7">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">AI Engine</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">Update Tenant Model</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Tenant ID: {String(editingConfig).slice(0, 8)}...</p>
                </div>
                <button onClick={() => setEditingConfig(null)} className="rounded-full border border-slate-200/70 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5">
                  Close
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Provider</label>
                  <select value={provider} onChange={(e) => setProvider(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                    <option value="openai">OpenAI</option>
                    <option value="groq">Groq</option>
                    <option value="anthropic">Anthropic</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Model Name</label>
                  <input type="text" value={model} onChange={(e) => setModel(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setEditingConfig(null)} className="rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5">Cancel</button>
                  <button
                    onClick={() => modelMutation.mutate({ orgId: editingConfig, payload: { llm_provider: provider, llm_model: model } })}
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:opacity-95"
                    disabled={modelMutation.isPending}
                  >
                    <Settings2 className="h-4 w-4" />
                    {modelMutation.isPending ? 'Saving...' : 'Save AI Engine'}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {subsUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-lg rounded-[28px] border border-white/10 bg-white/92 shadow-[0_30px_100px_rgba(15,23,42,0.28)] dark:bg-slate-900/94">
            <CardContent className="p-7">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">Subscription</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">Update Limits & Billing</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Adjust plan controls without changing any backend flow.</p>
                </div>
                <button onClick={() => setSubsUpdate(null)} className="rounded-full border border-slate-200/70 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5">
                  Close
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Plan Tier</label>
                  <select
                    value={subsUpdate.plan_tier}
                    onChange={(e) => setSubsUpdate({ ...subsUpdate, plan_tier: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-pink-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Max Agents</label>
                    <input type="number" value={subsUpdate.max_agents} onChange={(e) => setSubsUpdate({ ...subsUpdate, max_agents: parseInt(e.target.value) })} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-pink-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Max API Calls</label>
                    <input type="number" value={subsUpdate.max_api_calls} onChange={(e) => setSubsUpdate({ ...subsUpdate, max_api_calls: parseInt(e.target.value) })} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-pink-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
                  </div>
                </div>

                <label className="flex items-center gap-3 rounded-2xl border border-red-200/70 bg-red-50/80 px-4 py-3 dark:border-red-400/20 dark:bg-red-500/10">
                  <input type="checkbox" checked={subsUpdate.is_suspended} onChange={(e) => setSubsUpdate({ ...subsUpdate, is_suspended: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-red-500" />
                  <div>
                    <p className="text-sm font-semibold text-red-700 dark:text-red-300">Suspend organization access</p>
                    <p className="text-xs text-red-600/80 dark:text-red-300/80">Use this only when the tenant should be blocked from active usage.</p>
                  </div>
                </label>

                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setSubsUpdate(null)} className="rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5">Cancel</button>
                  <button
                    onClick={() => subMutation.mutate({ orgId: subsUpdate.id, payload: subsUpdate })}
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 px-5 py-2.5 text-sm font-medium text-white hover:opacity-95"
                    disabled={subMutation.isPending}
                  >
                    <ShieldAlert className="h-4 w-4" />
                    {subMutation.isPending ? 'Saving...' : 'Save Limits'}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
