'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import superApi from '@/lib/super-api'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Card, CardContent } from '@/components/ui/Card'
import { format } from 'date-fns'
import toast, { Toaster } from 'react-hot-toast'
import { Settings2, Zap, Save } from 'lucide-react'
import { setAuth } from '@/lib/auth'

export default function TenantsPage() {
  const queryClient = useQueryClient()
  const { data: tenants, isLoading } = useQuery({
    queryKey: ['super-tenants-list'],
    queryFn: async () => (await superApi.get('/api/v1/super-admin/tenants')).data,
  })

  // State for active modal / edit forms
  const [editingConfig, setEditingConfig] = useState<any>(null)
  const [provider, setProvider] = useState('openai')
  const [model, setModel] = useState('gpt-4o-mini')
  
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


  if (isLoading) return <LoadingSpinner />

  return (
    <div>
      <Toaster />
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tenant Management</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1">Configure limits, AI models, and view all registered hospitals.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500 dark:text-slate-400">
            <thead className="text-xs text-gray-700 dark:text-slate-400 uppercase bg-gray-50 dark:bg-slate-800/50 border-b dark:border-slate-800 transition-colors">
              <tr>
                <th className="px-6 py-4">Hospital Name</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Plan & Agents</th>
                <th className="px-6 py-4">AI Engine</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants?.map((t: any) => (
                <tr key={t.organization.id} className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                    {t.organization.name}
                    <span className="block text-xs text-gray-400 font-mono mt-1">{t.organization.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    {t.organization.email}
                    <div className="text-xs text-gray-400">{t.organization.phone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${t.subscription?.is_suspended ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {t.subscription?.is_suspended ? 'Suspended' : (t.subscription?.plan_tier || 'free').toUpperCase()}
                    </span>
                    <div className="text-xs text-gray-500 mt-1">Agents: {t.subscription?.max_agents || 1}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Zap className="w-3 h-3 text-pink-500" />
                      {t.llm_provider?.toUpperCase() || 'OPENAI'}
                    </div>
                    <div className="text-xs text-gray-500">{t.llm_model || 'gpt-4o-mini'}</div>
                  </td>
                  <td className="px-6 py-4 flex gap-3">
                    <button
                      onClick={() => {
                        setEditingConfig(t.organization.id)
                        setProvider(t.llm_provider || 'openai')
                        setModel(t.llm_model || 'gpt-4o-mini')
                      }}
                      className="text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      <Settings2 className="w-4 h-4" /> AI Config
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
                       className="text-pink-600 hover:underline flex items-center gap-1"
                    >
                      Limits
                    </button>

                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tenants?.length === 0 && (
             <div className="p-8 text-center text-gray-500">No tenants registered yet.</div>
          )}
        </div>
      </div>

      {/* Model Config Modal */}
      {editingConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
             <CardContent className="p-6">
                <h3 className="text-lg font-bold mb-4">Edit AI Engine (Tenant ID: {editingConfig.split('-')[0]}...)</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Provider</label>
                    <select value={provider} onChange={(e) => setProvider(e.target.value)} className="w-full border p-2 rounded-lg">
                      <option value="openai">OpenAI</option>
                      <option value="groq">Groq</option>
                      <option value="anthropic">Anthropic</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Model Name</label>
                    <input type="text" value={model} onChange={(e) => setModel(e.target.value)} className="w-full border p-2 rounded-lg" />
                  </div>
                  <div className="flex gap-3 justify-end mt-6">
                    <button onClick={() => setEditingConfig(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                    <button 
                      onClick={() => modelMutation.mutate({ orgId: editingConfig, payload: { llm_provider: provider, llm_model: model } })}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                      disabled={modelMutation.isPending}
                    >
                       {modelMutation.isPending ? 'Saving...' : 'Save AI Engine'}
                    </button>
                  </div>
                </div>
             </CardContent>
          </Card>
        </div>
      )}

      {/* Subscription Modal */}
      {subsUpdate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
             <CardContent className="p-6">
                <h3 className="text-lg font-bold mb-4">Update Limits & Billing</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Plan Tier</label>
                    <select 
                      value={subsUpdate.plan_tier} 
                      onChange={(e) => setSubsUpdate({...subsUpdate, plan_tier: e.target.value})} 
                      className="w-full border p-2 rounded-lg"
                    >
                      <option value="free">Free</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Max Agents</label>
                      <input type="number" value={subsUpdate.max_agents} onChange={(e) => setSubsUpdate({...subsUpdate, max_agents: parseInt(e.target.value)})} className="w-full border p-2 rounded-lg" />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 mt-4 cursor-pointer">
                    <input type="checkbox" checked={subsUpdate.is_suspended} onChange={(e) => setSubsUpdate({...subsUpdate, is_suspended: e.target.checked})} className="w-4 h-4 rounded text-red-500 border-gray-300" />
                    <span className="text-sm font-medium text-red-600">Suspend Organization Access</span>
                  </label>
                  <div className="flex gap-3 justify-end mt-6">
                    <button onClick={() => setSubsUpdate(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                    <button 
                      onClick={() => subMutation.mutate({ orgId: subsUpdate.id, payload: subsUpdate })}
                      className="bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 flex items-center gap-2"
                      disabled={subMutation.isPending}
                    >
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
