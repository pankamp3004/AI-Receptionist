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
    <div className="min-h-screen flex flex-col md:flex-row selection:bg-indigo-100 selection:text-indigo-900">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-950 bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-white flex-shrink-0 flex flex-col shadow-2xl z-20 relative">
        <div className="p-6 border-b border-white/5 flex items-center gap-3">
          <ShieldAlert className="h-8 w-8 text-pink-500 drop-shadow-md" />
          <div>
            <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Super Admin</h2>
            <p className="text-xs text-indigo-300 font-medium truncate">V2 System Control</p>
          </div>
        </div>
        
        <nav className="p-4 space-y-2 flex-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-900/20' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
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
             <p className="text-sm font-semibold text-white truncate">{superAdmin.super_admin_name}</p>
             <p className="text-[11px] text-indigo-300 font-medium uppercase tracking-wider mt-0.5">Global Protocol</p>
          </div>
          <button
            onClick={() => {
              clearSuperAuth()
              router.push('/super-admin/login')
            }}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-pink-400 hover:bg-pink-500/10 hover:text-pink-300 transition-colors font-medium"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 md:p-8 bg-gradient-to-br from-indigo-900 via-violet-800 to-purple-900 relative">
        {/* Deep, highly saturated background gradients */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
           <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/40 rounded-full blur-[120px] mix-blend-screen overflow-hidden"></div>
           <div className="absolute top-[20%] right-[-5%] w-[45%] h-[55%] bg-fuchsia-500/40 rounded-full blur-[120px] mix-blend-screen overflow-hidden"></div>
           <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[60%] bg-pink-500/40 rounded-full blur-[120px] mix-blend-screen overflow-hidden"></div>
           <div className="absolute top-[40%] left-[40%] w-[40%] h-[40%] bg-cyan-400/20 rounded-full blur-[120px] mix-blend-screen overflow-hidden"></div>
        </div>
        
        {/* Floating Glassmorphism Container */}
        <div className="max-w-7xl mx-auto relative z-10 bg-white/95 backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.2)] rounded-[2rem] p-6 md:p-10 border border-white/40 min-h-[calc(100vh-4rem)]">
          {children}
        </div>
      </main>
    </div>
  )
}
