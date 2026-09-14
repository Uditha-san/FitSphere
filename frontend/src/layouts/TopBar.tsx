import React from 'react'
import { Menu, ExternalLink, Building2, ShieldCheck, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

interface TopBarProps {
  activeNav: string
  onOpenMobile: () => void
}

export const TopBar: React.FC<TopBarProps> = ({ activeNav, onOpenMobile }) => {
  const { user, logout } = useAuth()

  // Format title based on active nav ID
  const getSectionTitle = (): string => {
    switch (activeNav) {
      case 'dashboard':
        return 'Dashboard'
      case 'assignments':
        return user?.role === 'coach'
          ? 'My Athletes & Clients'
          : user?.role === 'client'
          ? 'My Personal Trainer'
          : 'Coach-Client Assignments'
      case 'dev':
        return 'Developer Tools & Diagnostics'
      case 'workouts':
        return 'Workouts & Training Plans'
      case 'schedule':
        return 'Schedule & Sessions'
      case 'videos':
        return 'Workout Videos'
      case 'progress':
        return 'Progress & Tracking'
      case 'reports':
        return 'Reports & Analytics'
      case 'settings':
        return 'Gym Settings'
      case 'profile':
        return 'Account Profile'
      case 'gyms':
        return 'Gyms & Tenants'
      case 'users':
        return 'User Directory'
      default:
        return 'FitSphere'
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
      {/* Left: Mobile Toggle & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobile}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition md:hidden cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            {getSectionTitle()}
          </h1>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            {user?.tenant_id ? (
              <span className="flex items-center gap-1 text-blue-400">
                <Building2 className="h-3 w-3" /> PowerFit Gym
              </span>
            ) : (
              <span className="flex items-center gap-1 text-purple-400">
                <ShieldCheck className="h-3 w-3" /> Platform Global Scope
              </span>
            )}
            <span className="text-slate-600">&bull;</span>
            <span className="capitalize text-slate-400">{user?.role.replace('_', ' ')}</span>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        <a
          href="http://localhost:8000/docs"
          target="_blank"
          rel="noreferrer"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
        >
          <span>Swagger API Docs</span>
          <ExternalLink className="h-3.5 w-3.5 text-indigo-400" />
        </a>

        <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
          <div className="hidden sm:block text-right">
            <div className="text-xs font-semibold text-white">
              {user?.full_name || user?.email}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">{user?.email}</div>
          </div>

          <button
            onClick={logout}
            title="Sign Out"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  )
}

export default TopBar
