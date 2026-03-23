'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getSuperAuth, clearSuperAuth } from '@/lib/super-auth'
import Link from 'next/link'
import { ShieldAlert, LayoutDashboard, Building2, LogOut, Users, Sun, Moon } from 'lucide-react'
import { ThemeProvider } from '@/components/ThemeProvider'
import { useTheme } from 'next-themes'

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-colors font-medium mb-2"
    >
      {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      <span className="font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
    </button>
  )
}

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
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="min-h-screen flex flex-col md:flex-row font-sans text-slate-800 dark:text-slate-200 selection:bg-indigo-100 selection:text-indigo-900">
      <aside className="w-full md:w-72 bg-[linear-gradient(180deg,#070B14_0%,#0B1020_40%,#111827_100%)] text-white flex-shrink-0 flex flex-col border-r border-white/5 relative z-20 md:h-screen md:sticky top-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.35),_transparent_58%)] pointer-events-none" />
        <div className="absolute -left-16 bottom-20 h-40 w-40 rounded-full bg-fuchsia-500/10 blur-3xl pointer-events-none" />

        <div className="px-6 py-8 border-b border-white/5 flex flex-col items-center justify-center gap-3 relative">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-indigo-500 via-violet-500 to-fuchsia-500 flex items-center justify-center shadow-[0_16px_40px_rgba(99,102,241,0.35)]">
            <ShieldAlert className="h-6 w-6 text-white" />
          </div>
          <div className="text-center mt-2">
            <h2 className="text-xl font-bold tracking-tight text-white">Super Admin</h2>
            <p className="text-[11px] text-slate-400 font-medium tracking-[0.28em] uppercase mt-1">V2 System Control</p>
          </div>
        </div>
        
        <nav className="p-4 space-y-2 flex-1 relative">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 font-medium border ${
                  isActive 
                    ? 'border-indigo-400/20 bg-gradient-to-r from-indigo-500/20 to-fuchsia-500/10 text-white shadow-[0_14px_30px_rgba(79,70,229,0.16)]'
                    : 'border-transparent text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className={`rounded-xl p-2 transition-colors ${isActive ? 'bg-white/10' : 'bg-white/0 group-hover:bg-white/5'}`}>
                  <item.icon className={`h-5 w-5 ${isActive ? 'text-indigo-300' : 'text-slate-500 group-hover:text-slate-300'}`} />
                </div>
                <span className="font-medium">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-white/5 bg-white/[0.02] backdrop-blur-sm relative">
          <ThemeToggle />
          <div className="mb-4 rounded-2xl border border-white/5 bg-white/[0.04] px-4 py-3">
             <p className="text-sm font-semibold text-white truncate">{superAdmin.super_admin_name}</p>
             <p className="text-[11px] text-slate-500 font-medium uppercase tracking-[0.24em] mt-1">Global Protocol</p>
          </div>
          <button
            onClick={() => {
              clearSuperAuth()
              router.push('/super-admin/login')
            }}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-2xl text-slate-300 hover:bg-red-500/10 hover:text-red-400 transition-colors font-medium"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-[radial-gradient(circle_at_top_left,_rgba(109,94,248,0.12),_transparent_18%),radial-gradient(circle_at_top_right,_rgba(255,79,163,0.12),_transparent_20%),linear-gradient(180deg,_#F8FAFC_0%,_#EEF2FF_38%,_#F8FAFC_100%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.16),_transparent_18%),radial-gradient(circle_at_top_right,_rgba(236,72,153,0.12),_transparent_20%),linear-gradient(180deg,_#020617_0%,_#020617_55%,_#0F172A_100%)] relative transition-colors duration-200">
        <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="max-w-[1650px] w-full mx-auto p-4 md:p-8 lg:p-10 relative z-10">
          {children}
        </div>
      </main>
      </div>
    </ThemeProvider>
  )
}
