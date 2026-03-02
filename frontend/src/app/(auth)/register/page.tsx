'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api, { getErrorMessage } from '@/lib/api'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { Activity } from 'lucide-react'

const schema = z.object({
  name: z.string().min(2, 'Organization name required'),
  email: z.string().email('Invalid email'),
  admin_password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().min(7, 'Phone required'),
  address: z.string().min(5, 'Address required'),
  timezone: z.string().min(1, 'Timezone required'),
  admin_name: z.string().min(2, 'Admin name required'),
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { timezone: 'Asia/Kolkata' },
  })

  const onSubmit = async (data: FormData) => {
    setError('')
    try {
      await api.post('/api/v1/auth/register', data)
      setSuccess(true)
      setTimeout(() => router.push('/login'), 2000)
    } catch (e: any) {
      setError(getErrorMessage(e, 'Registration failed'))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-lg p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-blue-600 rounded-lg p-2">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Register Organization</h1>
            <p className="text-sm text-gray-500">Create your AI Receptionist account</p>
          </div>
        </div>

        {success ? (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-4 text-sm text-green-700 text-center">
            Registration successful! Redirecting to login...
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                id="name"
                label="Organization Name"
                placeholder="City General Hospital"
                error={errors.name?.message}
                {...register('name')}
              />
              <Input
                id="admin_name"
                label="Admin Name"
                placeholder="Dr. John Doe"
                error={errors.admin_name?.message}
                {...register('admin_name')}
              />
            </div>
            <Input
              id="email"
              label="Admin Email"
              type="email"
              placeholder="admin@hospital.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              id="admin_password"
              label="Password"
              type="password"
              placeholder="Min. 8 characters"
              error={errors.admin_password?.message}
              {...register('admin_password')}
            />
            <Input
              id="phone"
              label="Phone"
              placeholder="+91-9876543210"
              error={errors.phone?.message}
              {...register('phone')}
            />
            <Input
              id="address"
              label="Address"
              placeholder="123 Main Street, City"
              error={errors.address?.message}
              {...register('address')}
            />
            <Input
              id="timezone"
              label="Timezone"
              placeholder="Asia/Kolkata"
              error={errors.timezone?.message}
              {...register('timezone')}
            />

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
              Create Organization
            </Button>
          </form>
        )}

        <p className="text-sm text-center text-gray-600 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
