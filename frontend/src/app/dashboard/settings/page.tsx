'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/lib/api'
import { Organization } from '@/types'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Settings, Building2, CheckCircle } from 'lucide-react'

const schema = z.object({
  name: z.string().min(2, 'Organization name required'),
  phone: z.string().min(7, 'Phone required').optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  timezone: z.string().min(1, 'Timezone required'),
})

type FormData = z.infer<typeof schema>

const TIMEZONE_OPTIONS = [
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Australia/Sydney',
  'UTC',
]

export default function SettingsPage() {
  const qc = useQueryClient()
  const [saved, setSaved] = useState(false)

  const { data: org, isLoading } = useQuery<Organization>({
    queryKey: ['organization'],
    queryFn: async () => (await api.get('/api/v1/organizations/me')).data,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (org) {
      reset({
        name: org.name,
        phone: org.phone ?? '',
        address: org.address ?? '',
        timezone: org.timezone,
      })
    }
  }, [org, reset])

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => api.patch('/api/v1/organizations/me', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organization'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  if (isLoading) return <LoadingSpinner />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-gray-700 rounded-lg p-2">
            <Settings className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-500 mt-0.5">Manage your organization profile</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Org Info Card */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-gray-500" />
                <h2 className="font-semibold text-gray-900">Organization Profile</h2>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-5">
                <Input
                  id="name"
                  label="Organization Name"
                  placeholder="City General Hospital"
                  error={errors.name?.message}
                  {...register('name')}
                />
                <Input
                  id="phone"
                  label="Phone Number"
                  placeholder="+91-9876543210"
                  error={errors.phone?.message}
                  {...register('phone')}
                />
                <Input
                  id="address"
                  label="Address"
                  placeholder="123 Main Street, City, State"
                  error={errors.address?.message}
                  {...register('address')}
                />
                <div>
                  <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Timezone
                  </label>
                  <select
                    id="timezone"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    {...register('timezone')}
                  >
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                  {errors.timezone && (
                    <p className="mt-1 text-xs text-red-600">{errors.timezone.message}</p>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-2">
                  {saved && (
                    <div className="flex items-center gap-1.5 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>Changes saved!</span>
                    </div>
                  )}
                  <div className="ml-auto">
                    <Button
                      type="submit"
                      loading={isSubmitting || saveMutation.isPending}
                      disabled={!isDirty && !saveMutation.isSuccess}
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Meta Info Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-gray-900">Account Details</h2>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4">
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Organization ID</dt>
                  <dd className="mt-1 text-xs text-gray-600 font-mono break-all">{org?.id}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email</dt>
                  <dd className="mt-1 text-sm text-gray-700">{org?.email}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Type</dt>
                  <dd className="mt-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                      {org?.type}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Member Since</dt>
                  <dd className="mt-1 text-sm text-gray-700">
                    {org?.created_at
                      ? new Date(org.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : '—'}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-semibold text-gray-900">Security</h2>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                Your password is managed securely. Contact support to reset your password.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-700">
                🔒 Passwords are hashed with bcrypt and are never stored in plain text.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
