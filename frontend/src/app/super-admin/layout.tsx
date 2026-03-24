'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getSuperAuth, clearSuperAuth } from '@/lib/super-auth'
import Link from 'next/link'
import {
  ShieldAlert,
  LayoutDashboard,
  Building2,
  LogOut,
  Users,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
} from 'lucide-react'
import { ThemeProvider } from '@/components/ThemeProvider'
import { useTheme } from 'next-themes'

function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white ${collapsed ? 'justify-center px-2' : ''}`}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      {!collapsed ? <span className="font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span> : null}
    </button>
  )
}

function SidebarShell({
  pathname,
  superAdmin,
  collapsed,
  onCloseMobile,
  onToggleCollapse,
}: {
  pathname: string
  superAdmin: any
  collapsed: boolean
  onCloseMobile: () => void
  onToggleCollapse: () => void
}) {
  const router = useRouter()

  const navItems = [
    { name: 'Dashboard', href: '/super-admin/dashboard', icon: LayoutDashboard },
    { name: 'Tenants', href: '/super-admin/tenants', icon: Building2 },
    { name: 'Team', href: '/super-admin/team', icon: Users },
  ]

  return (
    <aside
      className={`flex h-full flex-col overflow-hidden border-r border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(241,245,249,0.94)_42%,rgba(248,250,252,0.98)_100%)] text-slate-800 shadow-[0_10px_50px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/5 dark:bg-[linear-gradient(180deg,#070B14_0%,#0B1020_40%,#111827_100%)] dark:text-white dark:shadow-none ${collapsed ? 'md:w-24' : 'md:w-72'} w-[88vw] max-w-[320px] transition-[width] duration-300`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.18),transparent_58%)] dark:bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.35),transparent_58%)]" />
      <div className="pointer-events-none absolute -left-16 bottom-20 h-40 w-40 rounded-full bg-fuchsia-500/10 blur-3xl" />

      <div className={`relative flex items-center border-b border-slate-200/70 px-4 py-5 dark:border-white/5 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 via-violet-500 to-fuchsia-500 shadow-[0_16px_40px_rgba(99,102,241,0.25)] dark:shadow-[0_16px_40px_rgba(99,102,241,0.35)]">
              <ShieldAlert className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">Super Admin</h2>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">V2 System Control</p>
            </div>
          </div>
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 via-violet-500 to-fuchsia-500 shadow-[0_16px_40px_rgba(99,102,241,0.25)] dark:shadow-[0_16px_40px_rgba(99,102,241,0.35)]">
            <ShieldAlert className="h-6 w-6 text-white" />
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className={`hidden rounded-xl border border-slate-200/70 p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white md:inline-flex ${collapsed ? 'absolute right-3 top-5' : ''}`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>

        <button
          onClick={onCloseMobile}
          className="inline-flex rounded-xl border border-slate-200/70 p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white md:hidden"
          title="Close sidebar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="relative flex-1 space-y-2 p-4">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={`group flex items-center gap-3 rounded-2xl border px-4 py-3.5 font-medium transition-all duration-200 ${
                collapsed ? 'justify-center px-2' : ''
              } ${
                isActive
                  ? 'border-indigo-400/20 bg-gradient-to-r from-indigo-500/20 to-fuchsia-500/10 text-slate-950 shadow-[0_14px_30px_rgba(79,70,229,0.12)] dark:text-white dark:shadow-[0_14px_30px_rgba(79,70,229,0.16)]'
                  : 'border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white'
              }`}
              title={collapsed ? item.name : undefined}
            >
              <div className={`rounded-xl p-2 transition-colors ${isActive ? 'bg-slate-900/5 dark:bg-white/10' : 'bg-transparent group-hover:bg-slate-900/5 dark:group-hover:bg-white/5'}`}>
                <item.icon className={`h-5 w-5 ${isActive ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-500 group-hover:text-slate-700 dark:text-slate-500 dark:group-hover:text-slate-300'}`} />
              </div>
              {!collapsed ? <span className="font-medium">{item.name}</span> : null}
            </Link>
          )
        })}
      </nav>

      <div className="relative mt-auto border-t border-slate-200/70 bg-slate-50/50 p-4 backdrop-blur-sm dark:border-white/5 dark:bg-white/[0.02]">
        <ThemeToggle collapsed={collapsed} />
        <div className={`mb-4 rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 dark:border-white/5 dark:bg-white/[0.04] ${collapsed ? 'hidden' : 'block'}`}>
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{superAdmin.super_admin_name}</p>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.24em] text-slate-500 dark:text-slate-500">Global Protocol</p>
        </div>
        <button
          onClick={() => {
            clearSuperAuth()
            router.push('/super-admin/login')
          }}
          className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-300 dark:hover:bg-red-500/10 dark:hover:text-red-400 ${collapsed ? 'justify-center px-2' : ''}`}
          title={collapsed ? 'Sign Out' : undefined}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed ? <span className="font-medium">Sign Out</span> : null}
        </button>
      </div>
    </aside>
  )
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const isLoginPage = pathname === '/super-admin/login'

  useEffect(() => {
    setMounted(true)
    if (!isLoginPage && !getSuperAuth()) {
      router.push('/super-admin/login')
    }
  }, [pathname, isLoginPage, router])

  if (!mounted) return null

  if (isLoginPage) {
    return <div className="min-h-screen bg-gray-50 dark:bg-slate-950">{children}</div>
  }

  const superAdmin = getSuperAuth()
  if (!superAdmin) return null

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="h-screen overflow-hidden font-sans text-slate-800 selection:bg-indigo-100 selection:text-indigo-900 dark:text-slate-200">
        <div className="flex h-full">
          <div className="fixed left-4 top-4 z-40 md:hidden">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="inline-flex rounded-2xl border border-slate-200/70 bg-white/90 p-3 text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.12)] backdrop-blur transition-colors hover:bg-white dark:border-white/10 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-900"
              title="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          {mobileSidebarOpen ? (
            <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm md:hidden" onClick={() => setMobileSidebarOpen(false)}>
              <div className="h-full" onClick={(e) => e.stopPropagation()}>
                <SidebarShell
                  pathname={pathname}
                  superAdmin={superAdmin}
                  collapsed={false}
                  onCloseMobile={() => setMobileSidebarOpen(false)}
                  onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
                />
              </div>
            </div>
          ) : null}

          <div className="relative hidden h-full shrink-0 md:block">
            <SidebarShell
              pathname={pathname}
              superAdmin={superAdmin}
              collapsed={sidebarCollapsed}
              onCloseMobile={() => setMobileSidebarOpen(false)}
              onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
            />
          </div>

          <main className="relative h-full flex-1 overflow-y-auto overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_rgba(109,94,248,0.12),_transparent_18%),radial-gradient(circle_at_top_right,_rgba(255,79,163,0.12),_transparent_20%),linear-gradient(180deg,_#F8FAFC_0%,_#EEF2FF_38%,_#F8FAFC_100%)] transition-colors duration-200 dark:bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.16),_transparent_18%),radial-gradient(circle_at_top_right,_rgba(236,72,153,0.12),_transparent_20%),linear-gradient(180deg,_#020617_0%,_#020617_55%,_#0F172A_100%)]">
            <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:32px_32px]" />
            <div className="relative z-10 mx-auto w-full max-w-[1650px] p-4 pt-20 md:p-8 md:pt-8 lg:p-10">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ThemeProvider>
  )
}
