'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getSuperAuth, clearSuperAuth } from '@/lib/super-auth'
import Link from 'next/link'
import { ShieldAlert, LayoutDashboard, Building2, LogOut, Users } from 'lucide-react'

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const isLoginPage = pathname === '/super-admin/login'

  useEffect(() => {
    setMounted(true)
    if (!isLoginPage && !getSuperAuth()) {
      router.push('/super-admin/login')
    }
  }, [pathname, isLoginPage, router])

  if (!mounted) return null

  if (isLoginPage) {
    return <div className="min-h-screen bg-gray-50">{children}</div>
  }

  const superAdmin = getSuperAuth()
  if (!superAdmin) return null

  const navItems = [
    { name: 'Dashboard', href: '/super-admin/dashboard', icon: LayoutDashboard },
    { name: 'Tenants', href: '/super-admin/tenants', icon: Building2 },
    { name: 'Team', href: '/super-admin/team', icon: Users },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex-shrink-0">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <ShieldAlert className="h-8 w-8 text-pink-500" />
          <div>
            <h2 className="text-xl font-bold tracking-tight">Super Admin</h2>
            <p className="text-xs text-slate-400 truncate">V2 System Control</p>
          </div>
        </div>
        
        <nav className="p-4 space-y-2 flex-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-slate-800">
          <div className="mb-4 px-2">
            <p className="text-sm font-medium text-white">{superAdmin.super_admin_name}</p>
            <p className="text-xs text-slate-400">Global Admin</p>
          </div>
          <button
            onClick={() => {
              clearSuperAuth()
              router.push('/super-admin/login')
            }}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
