'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Stethoscope, Calendar, Users, CalendarCheck,
  Bot, Phone, Settings, LogOut, Activity, Award
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/doctors', label: 'Doctors', icon: Stethoscope },
  { href: '/dashboard/specialties', label: 'Specialties', icon: Award },
  { href: '/dashboard/schedules', label: 'Schedules', icon: Calendar },
  { href: '/dashboard/patients', label: 'Patients', icon: Users },
  { href: '/dashboard/appointments', label: 'Appointments', icon: CalendarCheck },
  { href: '/dashboard/ai-config', label: 'AI Config', icon: Bot },
  { href: '/dashboard/call-logs', label: 'Call Logs', icon: Phone },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-gray-900 flex flex-col z-30">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-700">
        <div className="bg-blue-600 rounded-lg p-2">
          <Activity className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm">AI Receptionist</p>
          <p className="text-gray-400 text-xs">SaaS Platform</p>
        </div>
      </div>

      {user && (
        <div className="px-6 py-4 border-b border-gray-700">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Organization</p>
          <p className="text-sm text-white font-medium truncate">{user.admin_name}</p>
        </div>
      )}

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-colors',
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-700">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors w-full"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  )
}
