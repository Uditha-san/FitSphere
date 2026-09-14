import React, { useState } from 'react'
import {
  Dumbbell,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Building2,
  User as UserIcon,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import type { UserRole } from '../../types/auth'

export const LoginPage: React.FC = () => {
  const { login, switchDevUser, isLoading, error, clearError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setValidationError(null)

    if (!email.trim() || !password) {
      setValidationError('Please enter both email and password.')
      return
    }

    try {
      await login({ email: email.trim(), password })
    } catch {
      // Error handled by AuthContext
    }
  }

  const isDev = import.meta.env.DEV

  const demoAccounts: { role: UserRole; title: string; email: string; icon: React.ReactNode; color: string }[] = [
    {
      role: 'super_admin',
      title: 'Super Admin',
      email: 'superadmin@fitsphere.io',
      icon: <ShieldCheck className="h-4 w-4 text-purple-400" />,
      color: 'hover:border-purple-500/40 hover:bg-purple-500/10',
    },
    {
      role: 'gym_admin',
      title: 'Gym Admin',
      email: 'gymadmin@fitsphere.io',
      icon: <Building2 className="h-4 w-4 text-blue-400" />,
      color: 'hover:border-blue-500/40 hover:bg-blue-500/10',
    },
    {
      role: 'coach',
      title: 'Coach Mike',
      email: 'coach.mike@fitsphere.io',
      icon: <Dumbbell className="h-4 w-4 text-emerald-400" />,
      color: 'hover:border-emerald-500/40 hover:bg-emerald-500/10',
    },
    {
      role: 'client',
      title: 'Athlete Alex',
      email: 'client.alex@fitsphere.io',
      icon: <UserIcon className="h-4 w-4 text-cyan-400" />,
      color: 'hover:border-cyan-500/40 hover:bg-cyan-500/10',
    },
  ]

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-xl shadow-indigo-500/25 mb-2">
            <Dumbbell className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Fit<span className="text-indigo-400">Sphere</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            AI-Augmented Gym Management & Coaching Platform
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 backdrop-blur-xl p-8 shadow-2xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white">Welcome back</h2>
            <p className="text-xs text-slate-400">
              Sign in to access your dashboard and fitness ecosystem.
            </p>
          </div>

          {(error || validationError) && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2.5 animate-in fade-in duration-150">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{validationError || error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setValidationError(null)
                  }}
                  placeholder="name@gym.com"
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setValidationError(null)
                  }}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Developer Quick-Login Drawer (Available in Dev Mode) */}
          {isDev && (
            <div className="pt-5 border-t border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold uppercase tracking-wider text-[10px] text-indigo-400">
                  ⚡ Dev Mode Quick Demo Login
                </span>
                <span className="text-[10px] text-slate-500">1-click test</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {demoAccounts.map((demo) => (
                  <button
                    key={demo.role}
                    type="button"
                    onClick={() => switchDevUser(demo.role)}
                    disabled={isLoading}
                    className={`flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-left transition cursor-pointer ${demo.color} disabled:opacity-50`}
                  >
                    <div className="shrink-0">{demo.icon}</div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{demo.title}</div>
                      <div className="text-[10px] text-slate-500 truncate">{demo.email}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-600">
          FitSphere Modular Monolith &bull; Enterprise Fitness SaaS
        </p>
      </div>
    </div>
  )
}

export default LoginPage
