'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/lib/api'
import { Patient } from '@/types'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Badge from '@/components/ui/Badge'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  phone: z.string().min(7, 'Phone required'),
  gender: z.enum(['Male', 'Female', 'Other']).optional().or(z.literal('')),
  dob: z.string().optional().or(z.literal('')),
  is_active: z.boolean().default(true),
})
type FormData = z.infer<typeof schema>

export default function PatientsPage() {
  const qc = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState<Patient | null>(null)

  const { data: patients, isLoading } = useQuery<Patient[]>({
    queryKey: ['patients'],
    queryFn: async () => {
      // Patients array returned by API no longer contains phone directly
      // Phone is in the PatientAccount. For now, the backend might still
      // need updates if we want phone in the table. Let's assume it returns it or we fetch accounts.
      // Wait, PatientOut doesn't have phone. We'll need to handle that or ignore it in the list for now.
      return (await api.get('/api/v1/patients/')).data
    },
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { is_active: true }
  })

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload: any = { 
        name: data.name, 
        is_active: data.is_active 
      }
      if (data.gender) payload.gender = data.gender
      if (data.dob) payload.dob = data.dob

      if (editing) {
        return api.patch(`/api/v1/patients/${editing.id}`, payload)
      } else {
        // Create account first (idempotent)
        const accountRes = await api.post('/api/v1/patients/accounts', { mobile_no: data.phone })
        const accountId = accountRes.data.id
        payload.account_id = accountId
        return api.post('/api/v1/patients', payload)
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['patients'] }); closeModal() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/patients/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  })

  const openModal = (p?: Patient) => {
    setEditing(p ?? null)
    // We don't have phone in PatientOut currently. We'll leave it blank if editing.
    reset(p ? { 
      name: p.name, 
      phone: '', 
      gender: p.gender || undefined,
      dob: p.dob || undefined,
      is_active: p.is_active 
    } : { is_active: true })
    setIsOpen(true)
  }

  const closeModal = () => { setIsOpen(false); setEditing(null); reset() }

  if (isLoading) return <LoadingSpinner />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="text-gray-500 mt-1">Manage registered patients</p>
        </div>
        <Button onClick={() => openModal()}>
          <Plus className="h-4 w-4 mr-2" /> Add Patient
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-3 font-medium text-gray-500">Name</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Gender & DOB</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Registered</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {patients?.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{p.name}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {p.gender || '-'} {p.dob ? `(${p.dob})` : ''}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={p.is_active ? 'success' : 'default'}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{formatDate(p.created_at)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openModal(p)} className="text-gray-400 hover:text-blue-600">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => deleteMutation.mutate(p.id)} className="text-gray-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!patients?.length && (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400">No patients found.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Modal isOpen={isOpen} onClose={closeModal} title={editing ? 'Edit Patient' : 'Add Patient'}>
        <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="space-y-4">
          <Input id="name" label="Full Name" placeholder="John Doe" error={errors.name?.message} {...register('name')} />
          
          {/* Phone only required when creating new patient so we can find/create the account */}
          <Input 
            id="phone" 
            label="Mobile Number (Account)" 
            placeholder="+91-9876543210" 
            disabled={!!editing}
            error={errors.phone?.message} 
            {...register('phone')} 
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Gender</label>
              <select className="w-full border border-gray-300 rounded-md p-2 text-sm" {...register('gender')}>
                <option value="">Select...</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <Input id="dob" type="date" label="Date of Birth" error={errors.dob?.message} {...register('dob')} />
          </div>

          <div className="flex items-center pt-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" {...register('is_active')} />
              Active Patient
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={closeModal} className="flex-1">Cancel</Button>
            <Button type="submit" loading={isSubmitting || saveMutation.isPending} className="flex-1">
              {editing ? 'Save Changes' : 'Add Patient'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
