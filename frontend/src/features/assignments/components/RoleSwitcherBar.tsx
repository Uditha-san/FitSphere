import React, { useState } from 'react'
import {
  ShieldCheck,
  Building2,
  Dumbbell,
  User as UserIcon,
  LogIn,
  LogOut,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import type { UserRole } from '../../../types/auth'

export const RoleSwitcherBar: React.FC = () => {
  const { user, isAuthenticated, isLoading, error, switchDevUser, login, logout, clearError } =
    useAuth()
  const [showCustomLogin, setShowCustomLogin] = useState(false)
  const [customEmail, setCustomEmail] = useState('')
  const [customPassword, setCustomPassword] = useState('')

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customEmail || !customPassword) return
    try {
      await login({ email: customEmail, password: customPassword })
      setShowCustomLogin(false)
    } catch {
      // Handled in context
    }
  }

  const roleButtons: { role: UserRole; label: string; icon: React.ReactNode; color: string }[] = [
    {
      role: 'super_admin',
      label: 'Super Admin',
      icon: <ShieldCheck className="h-3.5 w-3.5" />,
      color: 'hover:border-purple-500/50 hover:bg-purple-500/10 text-purple-300',
    },
    {
      role: 'gym_admin',
      label: 'Gym Admin',
      icon: <Building2 className="h-3.5 w-3.5" />,
      color: 'hover:border-blue-500/50 hover:bg-blue-500/10 text-blue-300',
    },
    {
      role: 'coach',
      label: 'Coach (Mike)',
      icon: <Dumbbell className="h-3.5 w-3.5" />,
      color: 'hover:border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-300',
    },
    {
      role: 'client',
      label: 'Client (Alex)',
      icon: <UserIcon className="h-3.5 w-3.5" />,
      color: 'hover:border-cyan-500/50 hover:bg-cyan-500/10 text-cyan-300',
    },
  ]

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-sm p-4 shadow-xl space-y-3">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Active Session:
          </span>
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full uppercase tracking-wide bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {user.role}
              </span>
              <span className="text-xs text-white font-medium">
                {user.full_name || user.email}
              </span>
              <span className="text-xs text-slate-500 hidden sm:inline">({user.email})</span>
            </div>
          ) : (
            <span className="text-xs text-amber-400 font-medium">Not authenticated</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 font-medium mr-1">Quick Role Switch:</span>
          {roleButtons.map((btn) => {
            const isActive = user?.role === btn.role
            return (
              <button
                key={btn.role}
                onClick={() => switchDevUser(btn.role)}
                disabled={isLoading}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg border transition cursor-pointer disabled:opacity-50 ${
                  isActive
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30'
                    : `bg-slate-950/60 border-slate-800 text-slate-300 ${btn.color}`
                }`}
              >
                {btn.icon}
                {btn.label}
              </button>
            )
          })}

          <button
            onClick={() => {
              clearError()
              setShowCustomLogin(!showCustomLogin)
            }}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
          >
            {showCustomLogin ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            Custom
          </button>

          {isAuthenticated && (
            <button
              onClick={logout}
              title="Sign Out"
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition cursor-pointer"
            >
              <LogOut className="h-3 w-3" />
              Sign Out
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {showCustomLogin && (
        <form
          onSubmit={handleCustomLogin}
          className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center gap-2 text-xs"
        >
          <input
            type="email"
            placeholder="Email address"
            value={customEmail}
            onChange={(e) => setCustomEmail(e.target.value)}
            required
            className="w-full sm:w-64 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={customPassword}
            onChange={(e) => setCustomPassword(e.target.value)}
            required
            className="w-full sm:w-48 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogIn className="h-3.5 w-3.5" />}
            Sign In
          </button>
        </form>
      )}
    </div>
  )
}

export default RoleSwitcherBar
