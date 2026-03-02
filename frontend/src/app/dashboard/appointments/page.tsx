'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/lib/api'
import { Appointment, Doctor, Patient } from '@/types'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Plus, Trash2 } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

const STATUS_OPTIONS = [
  { value: 'Booked', label: 'Booked' },
  { value: 'Scheduled', label: 'Scheduled' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
  { value: 'NoShow', label: 'No Show' },
  { value: 'Rescheduled', label: 'Rescheduled' },
]

const schema = z.object({
  doctor_id: z.string().min(1, 'Select a doctor'),
  patient_id: z.string().min(1, 'Select a patient'),
  date_time: z.string().min(1, 'Select time'),
  app_status: z.string().min(1),
})
type FormData = z.infer<typeof schema>

function statusVariant(s: string): "info" | "success" | "danger" | "default" {
  const map: Record<string, "info" | "success" | "danger" | "default"> = { Booked: 'info', Scheduled: 'info', Confirmed: 'success', Cancelled: 'danger', Completed: 'default', NoShow: 'danger', Rescheduled: 'info' }
  return map[s] ?? 'default'
}

export default function AppointmentsPage() {
  const qc = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)

  const { data: appointments, isLoading } = useQuery<Appointment[]>({
    queryKey: ['appointments'],
    queryFn: async () => (await api.get('/api/v1/appointments/')).data,
  })
  const { data: doctors } = useQuery<Doctor[]>({ queryKey: ['doctors'], queryFn: async () => (await api.get('/api/v1/doctors/')).data })
  const { data: patients } = useQuery<Patient[]>({ queryKey: ['patients'], queryFn: async () => (await api.get('/api/v1/patients/')).data })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { app_status: 'Booked' },
  })

  const addMutation = useMutation({
    mutationFn: (data: FormData) => {
      const p = patients?.find(x => x.id === data.patient_id)
      if (!p) throw new Error("Patient not found")
      return api.post('/api/v1/appointments/', { ...data, account_id: p.account_id })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appointments'] }); setIsOpen(false); reset() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/appointments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  })

  if (isLoading) return <LoadingSpinner />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-500 mt-1">Manage all patient appointments</p>
        </div>
        <Button onClick={() => setIsOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Book Appointment
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-3 font-medium text-gray-500">Patient</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Doctor</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Date & Time</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {appointments?.map((a) => (
                <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{a.patient?.name ?? a.patient_id}</td>
                  <td className="px-6 py-4 text-gray-600">{a.doctor?.name ?? a.doctor_id}</td>
                  <td className="px-6 py-4 text-gray-600">{formatDateTime(a.date_time)}</td>
                  <td className="px-6 py-4">
                    <Badge variant={statusVariant(a.app_status)}>{a.app_status}</Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => deleteMutation.mutate(a.id)} className="text-gray-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {!appointments?.length && (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400">No appointments found.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Modal isOpen={isOpen} onClose={() => { setIsOpen(false); reset() }} title="Book Appointment">
        <form onSubmit={handleSubmit(d => addMutation.mutate(d))} className="space-y-4">
          <Select
            id="patient_id"
            label="Patient"
            options={patients?.map(p => ({ value: p.id, label: p.name })) ?? []}
            placeholder="Select patient"
            error={errors.patient_id?.message}
            {...register('patient_id')}
          />
          <Select
            id="doctor_id"
            label="Doctor"
            options={doctors?.map(d => ({ value: d.id, label: d.name })) ?? []}
            placeholder="Select doctor"
            error={errors.doctor_id?.message}
            {...register('doctor_id')}
          />
          <Input
            id="date_time"
            label="Date & Time"
            type="datetime-local"
            error={errors.date_time?.message}
            {...register('date_time')}
          />
          <Select
            id="app_status"
            label="Status"
            options={STATUS_OPTIONS}
            error={errors.app_status?.message}
            {...register('app_status')}
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={isSubmitting || addMutation.isPending} className="flex-1">Book</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
