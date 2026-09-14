import React from 'react'
import { Cpu, RefreshCw, ExternalLink, Users, Activity } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

interface HeaderProps {
  loading?: boolean
  onRefresh?: () => void
  activeTab: 'health' | 'assignments'
  onSelectTab: (tab: 'health' | 'assignments') => void
}

export const Header: React.FC<HeaderProps> = ({
  loading = false,
  onRefresh,
  activeTab,
  onSelectTab,
}) => {
  const { user, isAuthenticated } = useAuth()

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 px-6 py-3.5">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand & Tabs */}
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Cpu className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-xl tracking-tight text-white">FitSphere</h1>
                <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  v0.2.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Modular Monolith Platform</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800/80">
            <button
              onClick={() => onSelectTab('assignments')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'assignments'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              Coach-Client Assignments
            </button>
            <button
              onClick={() => onSelectTab('health')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'health'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              System Health
            </button>
          </nav>
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-3">
          {activeTab === 'health' && onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
              Check Status
            </button>
          )}

          {isAuthenticated && user && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-white">{user.full_name || user.email}</span>
              <span className="text-[10px] uppercase font-bold text-indigo-400 px-1.5 py-0.5 rounded bg-indigo-500/10">
                {user.role}
              </span>
            </div>
          )}

          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition"
          >
            Swagger Docs
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </header>
  )
}

export default Header
