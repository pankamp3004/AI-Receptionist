'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/lib/api'
import { Doctor, Specialty } from '@/types'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Plus, Pencil, Trash2, AlertCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  experiences: z.union([z.number(), z.string()]).optional(),
  degree_doc: z.string().optional(),
  status: z.enum(['Active', 'Inactive', 'Retired']).default('Active'),
  is_active: z.boolean().default(true),
  specialty_ids: z.array(z.string()).default([]),
})

type FormData = z.infer<typeof schema>

export default function DoctorsPage() {
  const qc = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState<Doctor | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const { data: doctors, isLoading } = useQuery<Doctor[]>({
    queryKey: ['doctors'],
    queryFn: async () => (await api.get('/api/v1/doctors')).data,
  })

  const { data: specialties } = useQuery<Specialty[]>({
    queryKey: ['specialties'],
    queryFn: async () => (await api.get('/api/v1/specialties')).data,
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'Active', is_active: true, specialty_ids: [] }
  })

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        name: data.name,
        experiences: data.experiences ? Number(data.experiences) : null,
        degree_doc: data.degree_doc || null,
        status: data.status,
        is_active: data.is_active,
        specialty_ids: data.specialty_ids
      }
      if (editing) return api.patch(`/api/v1/doctors/${editing.id}`, payload)
      return api.post('/api/v1/doctors', payload)
    },
    onSuccess: () => {
      setErrorMsg(null)
      qc.invalidateQueries({ queryKey: ['doctors'] })
      closeModal()
    },
    onError: (err: any) => {
      console.error(err)
      setErrorMsg(err?.response?.data?.detail || err.message || 'An error occurred while saving.')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/doctors/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doctors'] }),
  })

  const openModal = (doc?: Doctor) => {
    setEditing(doc ?? null)
    reset(doc ? { 
      name: doc.name, 
      experiences: doc.experiences || 0,
      degree_doc: doc.degree_doc || '',
      status: doc.status,
      is_active: doc.is_active,
      specialty_ids: (doc.specialties || []).map(s => s.id) 
    } : { status: 'Active', is_active: true, specialty_ids: [] })
    setErrorMsg(null)
    setIsOpen(true)
  }

  const closeModal = () => { setIsOpen(false); setEditing(null); setErrorMsg(null); reset() }

  if (isLoading) return <LoadingSpinner />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Doctors</h1>
          <p className="text-gray-500 mt-1">Manage your organization&apos;s doctors</p>
        </div>
        <Button onClick={() => openModal()} size="md">
          <Plus className="h-4 w-4 mr-2" /> Add Doctor
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-3 font-medium text-gray-500">Name</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Specialties</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Degree</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Added</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {doctors?.map((doc) => (
                <tr key={doc.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    <div>{doc.name}</div>
                    <div className="text-xs text-gray-500 font-normal">{doc.experiences ?? 0} years exp</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {(doc.specialties && doc.specialties.length > 0) ? (
                      <div className="flex gap-1 flex-wrap">
                        {doc.specialties.map(s => (
                          <span key={s.id} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">
                            {s.spec_name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">None</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{doc.degree_doc || '-'}</td>
                  <td className="px-6 py-4 flex gap-2">
                    <Badge variant={doc.status === 'Active' ? 'success' : 'default'}>
                      {doc.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{formatDate(doc.created_at)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openModal(doc)} className="text-gray-400 hover:text-blue-600 transition-colors">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => deleteMutation.mutate(doc.id)} className="text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!doctors?.length && (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">No doctors found. Add your first doctor.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Modal isOpen={isOpen} onClose={closeModal} title={editing ? 'Edit Doctor' : 'Add Doctor'}>
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md flex items-start gap-2 text-sm">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          <Input id="name" label="Full Name" placeholder="Dr. Jane Smith" error={errors.name?.message} {...register('name')} />
          
          <div className="grid grid-cols-2 gap-4">
             <Input id="degree_doc" label="Degree" placeholder="MD, MBBS" error={errors.degree_doc?.message} {...register('degree_doc')} />
             <Input id="experiences" type="number" label="Experience (Years)" placeholder="5" error={errors.experiences?.message} {...register('experiences')} />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Specialties</label>
            <select
              multiple
              className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              {...register('specialty_ids')}
              style={{ minHeight: '100px' }}
            >
              {specialties?.map(s => (
                <option key={s.id} value={s.id}>{s.spec_name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500">Hold Ctrl/Cmd to select multiple</p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Status</label>
              <select className="w-full border border-gray-300 rounded-md p-2 text-sm" {...register('status')}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Retired">Retired</option>
              </select>
            </div>
            
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" {...register('is_active')} />
                Visible in System
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={closeModal} className="flex-1">Cancel</Button>
            <Button type="submit" loading={isSubmitting || saveMutation.isPending} className="flex-1">
              {editing ? 'Save Changes' : 'Add Doctor'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
