'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/lib/api'
import { Specialty } from '@/types'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Plus, Trash2 } from 'lucide-react'

const schema = z.object({
  spec_name: z.string().min(2, 'Specialty name is required'),
})
type FormData = z.infer<typeof schema>

export default function SpecialtiesPage() {
  const qc = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)

  const { data: specialties, isLoading } = useQuery<Specialty[]>({
    queryKey: ['specialties'],
    queryFn: async () => (await api.get('/api/v1/specialties')).data,
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const addMutation = useMutation({
    mutationFn: (data: FormData) => api.post('/api/v1/specialties', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['specialties'] }); setIsOpen(false); reset() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/specialties/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['specialties'] }),
  })

  if (isLoading) return <LoadingSpinner />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Specialties</h1>
          <p className="text-gray-500 mt-1">Manage medical specialties for your organization</p>
        </div>
        <Button onClick={() => setIsOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Specialty
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-3 font-medium text-gray-500">Specialty Name</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">ID</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {specialties?.map((s) => (
                <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{s.spec_name}</td>
                  <td className="px-6 py-4 text-gray-500 font-mono text-xs">{s.id}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => deleteMutation.mutate(s.id)} className="text-gray-400 hover:text-red-600 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {!specialties?.length && (
                <tr><td colSpan={3} className="px-6 py-10 text-center text-gray-400">No specialties found. Add one above.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Modal isOpen={isOpen} onClose={() => { setIsOpen(false); reset() }} title="Add Specialty">
        <form onSubmit={handleSubmit(d => addMutation.mutate(d))} className="space-y-4">
          <Input 
            id="spec_name" 
            label="Specialty Name" 
            placeholder="e.g. Cardiology" 
            error={errors.spec_name?.message} 
            {...register('spec_name')} 
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={isSubmitting || addMutation.isPending} className="flex-1">Add Specialty</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
