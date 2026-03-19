'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import superApi from '@/lib/super-api'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Card, CardContent } from '@/components/ui/Card'
import { format } from 'date-fns'
import toast, { Toaster } from 'react-hot-toast'
import { Users, KeyRound, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { getSuperAuth } from '@/lib/super-auth'

export default function TeamPage() {
  const queryClient = useQueryClient()
  const currentAdmin = getSuperAuth()
  
  const { data: team, isLoading } = useQuery({
    queryKey: ['super-team-list'],
    queryFn: async () => (await superApi.get('/api/v1/super-admin/team')).data,
  })

  // State for adding team member
  const [showAddModal, setShowAddModal] = useState(false)
  const [newMember, setNewMember] = useState({ name: '', email: '', password: '' })

  // State for changing password
  const [changingPasswordId, setChangingPasswordId] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')

  const addMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await superApi.post('/api/v1/super-admin/team', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-team-list'] })
      toast.success('Team member added successfully')
      setShowAddModal(false)
      setNewMember({ name: '', email: '', password: '' })
    },
    onError: (err: any) => {
       toast.error(err.response?.data?.detail || 'Failed to add team member')
    }
  })

  const passwordMutation = useMutation({
    mutationFn: async ({ id, payload }: any) => {
      return await superApi.put(`/api/v1/super-admin/team/${id}/password`, payload)
    },
    onSuccess: () => {
      toast.success('Password updated successfully')
      setChangingPasswordId(null)
      setNewPassword('')
    },
    onError: () => toast.error('Failed to update password')
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await superApi.delete(`/api/v1/super-admin/team/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-team-list'] })
      toast.success('Team member removed successfully')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to remove team member')
    }
  })

  if (isLoading) return <LoadingSpinner />

  return (
    <div>
      <Toaster />
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Team Operations</h1>
          <p className="text-gray-500 mt-1">Manage super administrators and global system operator profiles.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 shadow-sm font-medium"
        >
          <Plus className="w-5 h-5" /> Add Team Member
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4">Operator Details</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Added On</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {team?.map((admin: any) => (
                <tr key={admin.id} className="bg-white border-b hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold">
                        {admin.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 flex items-center gap-2">
                          {admin.name} 
                          {currentAdmin?.super_admin_id === admin.id && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">YOU</span>}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{admin.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${admin.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {admin.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                     {format(new Date(admin.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 text-right flex gap-3 justify-end">
                    <button
                      onClick={() => setChangingPasswordId(admin.id)}
                      className="text-Pink-600 hover:text-pink-800 hover:underline flex items-center gap-1.5 ml-auto font-medium"
                    >
                      <KeyRound className="w-4 h-4" /> Reset Password
                    </button>
                    <button
                      onClick={() => {
                        if (team?.length <= 1) {
                          toast.error('Cannot remove the final platform operator.')
                          return
                        }
                        if (window.confirm('Are you sure you want to permanently remove this platform operator?')) {
                          deleteMutation.mutate(admin.id)
                        }
                      }}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors ml-2 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                      title={team?.length <= 1 ? "Cannot delete the only operator" : "Remove Member"}
                      disabled={deleteMutation.isPending || team?.length <= 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {team?.length === 0 && (
             <div className="p-8 text-center text-gray-500">No super admins found.</div>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md shadow-2xl border-0">
             <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600"><ShieldCheck className="w-6 h-6" /></div>
                  <h3 className="text-xl font-bold">Add Platform Operator</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5 text-gray-700">Full Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. John Operator"
                      value={newMember.name} 
                      onChange={(e) => setNewMember({...newMember, name: e.target.value})} 
                      className="w-full border-gray-300 border px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5 text-gray-700">Email Address (Login ID)</label>
                    <input 
                      type="email" 
                      placeholder="operator@system.com"
                      value={newMember.email} 
                      onChange={(e) => setNewMember({...newMember, email: e.target.value})} 
                      className="w-full border-gray-300 border px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5 text-gray-700">Initial Password</label>
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      value={newMember.password} 
                      onChange={(e) => setNewMember({...newMember, password: e.target.value})} 
                      className="w-full border-gray-300 border px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" 
                    />
                  </div>
                  <div className="flex gap-3 justify-end pt-4 mt-2 border-t">
                    <button onClick={() => setShowAddModal(false)} className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                    <button 
                      onClick={() => addMutation.mutate(newMember)}
                      className="bg-indigo-600 font-medium text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                      disabled={addMutation.isPending || !newMember.name || !newMember.email || !newMember.password}
                    >
                       {addMutation.isPending ? 'Creating Account...' : 'Create Account'}
                    </button>
                  </div>
                </div>
             </CardContent>
          </Card>
        </div>
      )}

      {/* Change Password Modal */}
      {changingPasswordId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm shadow-2xl border-0">
             <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-pink-100 rounded-lg text-pink-600"><KeyRound className="w-6 h-6" /></div>
                  <h3 className="text-xl font-bold">Reset Password</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5 text-gray-700">New Password</label>
                    <input 
                      type="password" 
                      placeholder="Enter new password"
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)} 
                      className="w-full border-gray-300 border px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all" 
                    />
                  </div>
                  
                  <div className="flex gap-3 justify-end pt-4 mt-2 border-t">
                    <button onClick={() => {
                        setChangingPasswordId(null)
                        setNewPassword('')
                    }} className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                    <button 
                      onClick={() => passwordMutation.mutate({ id: changingPasswordId, payload: { new_password: newPassword } })}
                      className="bg-pink-600 font-medium text-white px-5 py-2.5 rounded-lg hover:bg-pink-700 transition-colors shadow-sm disabled:opacity-50"
                      disabled={passwordMutation.isPending || newPassword.length < 6}
                    >
                       {passwordMutation.isPending ? 'Updating...' : 'Update Password'}
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
