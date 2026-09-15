import React from 'react'
import {
  Dumbbell,
  LayoutDashboard,
  Users,
  UserCheck,
  Calendar,
  TrendingUp,
  BarChart3,
  Settings,
  Terminal,
  LogOut,
  Award,
  PlaySquare,
  Building2,
  User as UserIcon,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import type { UserRole } from '../types/auth'

interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
  isPlaceholder?: boolean
  badge?: string
}

interface SidebarProps {
  activeNav: string
  onSelectNav: (id: string) => void
  isMobileOpen: boolean
  onCloseMobile: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeNav,
  onSelectNav,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { user, logout } = useAuth()
  const role: UserRole = user?.role || 'client'
  const isDev = import.meta.env.DEV

  // Define navigation configuration by role
  const getNavItems = (): NavItem[] => {
    switch (role) {
      case 'super_admin':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
          { id: 'gyms', label: 'Gyms & Tenants', icon: <Building2 className="h-4 w-4" />, isPlaceholder: true, badge: 'Soon' },
          { id: 'users', label: 'User Directory', icon: <Users className="h-4 w-4" />, isPlaceholder: true, badge: 'Soon' },
          { id: 'assignments', label: 'Coach Assignments', icon: <UserCheck className="h-4 w-4" /> },
          { id: 'workouts', label: 'Platform Training Plans', icon: <Dumbbell className="h-4 w-4" /> },
          { id: 'reports', label: 'Platform Reports', icon: <BarChart3 className="h-4 w-4" />, isPlaceholder: true, badge: 'Soon' },
        ]

      case 'gym_admin':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
          { id: 'assignments', label: 'Coach-Client Pairings', icon: <UserCheck className="h-4 w-4" /> },
          { id: 'workouts', label: 'Training Plans & Workouts', icon: <Dumbbell className="h-4 w-4" /> },
          { id: 'reports', label: 'Gym Reports', icon: <BarChart3 className="h-4 w-4" />, isPlaceholder: true, badge: 'Soon' },
          { id: 'settings', label: 'Gym Settings', icon: <Settings className="h-4 w-4" />, isPlaceholder: true, badge: 'Soon' },
        ]

      case 'coach':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
          { id: 'assignments', label: 'My Athletes & Clients', icon: <Users className="h-4 w-4" /> },
          { id: 'workouts', label: 'Training Plans', icon: <Dumbbell className="h-4 w-4" /> },
          { id: 'schedule', label: 'Schedule & Sessions', icon: <Calendar className="h-4 w-4" />, isPlaceholder: true, badge: 'Soon' },
          { id: 'progress', label: 'Client Progress', icon: <TrendingUp className="h-4 w-4" />, isPlaceholder: true, badge: 'Soon' },
          { id: 'profile', label: 'My Profile', icon: <UserIcon className="h-4 w-4" />, isPlaceholder: true, badge: 'Soon' },
        ]

      case 'client':
      default:
        return [
          { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
          { id: 'assignments', label: 'My Personal Trainer', icon: <Award className="h-4 w-4" /> },
          { id: 'workouts', label: 'My Training Plan', icon: <Dumbbell className="h-4 w-4" /> },
          { id: 'schedule', label: 'Schedule & Sessions', icon: <Calendar className="h-4 w-4" />, isPlaceholder: true, badge: 'Soon' },
          { id: 'videos', label: 'Workout Videos', icon: <PlaySquare className="h-4 w-4" />, isPlaceholder: true, badge: 'Soon' },
          { id: 'progress', label: 'My Progress', icon: <TrendingUp className="h-4 w-4" />, isPlaceholder: true, badge: 'Soon' },
          { id: 'profile', label: 'My Profile', icon: <UserIcon className="h-4 w-4" />, isPlaceholder: true, badge: 'Soon' },
        ]
    }
  }

  const navItems = getNavItems()

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Brand Header */}
          <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 shrink-0">
                <Dumbbell className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-lg text-white tracking-tight">
                    Fit<span className="text-indigo-400">Sphere</span>
                  </span>
                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-indigo-500/20 text-indigo-300">
                    SaaS
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  {user?.tenant_id ? 'PowerFit Gym' : 'Platform Scope'}
                </p>
              </div>
            </div>

            <button
              onClick={onCloseMobile}
              className="p-1 rounded-lg text-slate-400 hover:text-white md:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Navigation
            </div>
            {navItems.map((item) => {
              const isActive = activeNav === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectNav(item.id)
                    onCloseMobile()
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? 'text-white' : 'text-slate-400'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                        isActive
                          ? 'bg-indigo-700 text-indigo-100'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              )
            })}

            {/* Dedicated Developer Tools Entry in Dev Mode */}
            {isDev && (
              <div className="pt-4 mt-4 border-t border-slate-800/80">
                <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Engineering
                </div>
                <button
                  onClick={() => {
                    onSelectNav('dev')
                    onCloseMobile()
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    activeNav === 'dev'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                      : 'text-purple-400/80 hover:text-purple-300 hover:bg-purple-500/10'
                  }`}
                >
                  <Terminal className="h-4 w-4" />
                  <span>Developer Tools</span>
                </button>
              </div>
            )}
          </nav>
        </div>

        {/* User Profile Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                {user?.full_name?.charAt(0) || user?.email.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  {user?.full_name || user?.email}
                </div>
                <div className="text-[10px] uppercase font-bold text-indigo-400 tracking-wide">
                  {user?.role}
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
