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
    <div className="min-h-screen flex flex-col md:flex-row font-sans text-slate-800 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Sidebar - Sleek Dark Professional */}
      <aside className="w-full md:w-64 bg-[#0B0F19] text-white flex-shrink-0 flex flex-col border-r border-white/5 relative z-20">
        <div className="px-6 py-8 border-b border-white/5 flex flex-col items-center justify-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <ShieldAlert className="h-6 w-6 text-white" />
          </div>
          <div className="text-center mt-2">
            <h2 className="text-lg font-bold tracking-tight text-white">Super Admin</h2>
            <p className="text-[11px] text-slate-400 font-medium tracking-wide uppercase mt-1">V2 System Control</p>
          </div>
        </div>
        
        <nav className="p-4 space-y-2 flex-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium ${
                  isActive 
                    ? 'bg-indigo-600/10 text-indigo-400' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                <span className="font-medium">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-white/5">
          <div className="mb-4 px-2">
             <p className="text-sm font-semibold text-white truncate">{superAdmin.super_admin_name}</p>
             <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">Global Protocol</p>
          </div>
          <button
            onClick={() => {
              clearSuperAuth()
              router.push('/super-admin/login')
            }}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-red-500/10 hover:text-red-400 transition-colors font-medium"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content - Modern Clean Background */}
      <main className="flex-1 overflow-auto bg-[#F4F7FE] relative">
        <div className="max-w-[1600px] w-full mx-auto p-4 md:p-8 lg:p-10 relative z-10">
          {children}
        </div>
      </main>
    </div>
  )
}
