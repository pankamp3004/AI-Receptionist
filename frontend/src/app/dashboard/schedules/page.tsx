'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/lib/api'
import { DocShift, Doctor } from '@/types'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Plus, Trash2 } from 'lucide-react'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const schema = z.object({
  doctor_id: z.string().min(1, 'Select a doctor'),
  day_of_week: z.string().min(1, 'Select a day'),
  start_time: z.string().min(1, 'Start time required'),
  end_time: z.string().min(1, 'End time required'),
  status: z.enum(['Active', 'Inactive', 'OnLeave']).default('Active')
})

type FormData = z.infer<typeof schema>

export default function SchedulesPage() {
  const qc = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)

  const { data: doctors, isLoading: loadingDoctors } = useQuery<Doctor[]>({
    queryKey: ['doctors'],
    queryFn: async () => (await api.get('/api/v1/doctors')).data,
  })

  const { data: schedules, isLoading: loadingShifts } = useQuery<DocShift[]>({
    queryKey: ['schedules'],
    queryFn: async () => (await api.get('/api/v1/shifts')).data,
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'Active' }
  })

  const addMutation = useMutation({
    mutationFn: (data: FormData) => api.post(`/api/v1/shifts`, {
      doc_id: data.doctor_id,
      day_of_week: data.day_of_week,
      start_time: data.start_time,
      end_time: data.end_time,
      status: data.status,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['schedules'] }); setIsOpen(false); reset() },
  })

  const deleteMutation = useMutation({
    mutationFn: (shift_id: string) => 
      api.delete(`/api/v1/shifts/${shift_id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules'] }),
  })

  const doctorOptions = doctors?.map(d => ({ value: d.id, label: d.name })) ?? []
  const dayOptions = DAYS.map((d) => ({ value: d, label: d }))
  const doctorMap = Object.fromEntries((doctors ?? []).map(d => [d.id, d.name]))

  if (loadingDoctors || loadingShifts) return <LoadingSpinner />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Doctor Schedules</h1>
          <p className="text-gray-500 mt-1">Set shifting availability for each doctor</p>
        </div>
        <Button onClick={() => setIsOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Schedule
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-3 font-medium text-gray-500">Doctor</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Day</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Start Time</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">End Time</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {schedules?.map((s) => (
                <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{doctorMap[s.doc_id] ?? s.doc_id}</td>
                  <td className="px-6 py-4 text-gray-600">{s.day_of_week}</td>
                  <td className="px-6 py-4 text-gray-600">{s.start_time}</td>
                  <td className="px-6 py-4 text-gray-600">{s.end_time}</td>
                  <td className="px-6 py-4">
                     <Badge variant={s.status === 'Active' ? 'success' : s.status === 'Inactive' ? 'danger' : 'warning'}>
                      {s.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => deleteMutation.mutate(s.id)} className="text-gray-400 hover:text-red-600 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {!schedules?.length && (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">No schedules found.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Modal isOpen={isOpen} onClose={() => { setIsOpen(false); reset() }} title="Add Schedule">
        <form onSubmit={handleSubmit(d => addMutation.mutate(d))} className="space-y-4">
          <Select
            id="doctor_id"
            label="Doctor"
            options={doctorOptions}
            placeholder="Select a doctor"
            error={errors.doctor_id?.message}
            {...register('doctor_id')}
          />
          <Select
            id="day_of_week"
            label="Day of Week"
            options={dayOptions}
            error={errors.day_of_week?.message}
            {...register('day_of_week')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input id="start_time" label="Start Time" type="time" error={errors.start_time?.message} {...register('start_time')} />
            <Input id="end_time" label="End Time" type="time" error={errors.end_time?.message} {...register('end_time')} />
          </div>
          <Select
            id="status"
            label="Status"
            options={[
              { value: 'Active', label: 'Active' },
              { value: 'Inactive', label: 'Inactive' },
              { value: 'OnLeave', label: 'On Leave' }
            ]}
            error={errors.status?.message}
            {...register('status')}
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={isSubmitting || addMutation.isPending} className="flex-1">Add Schedule</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
