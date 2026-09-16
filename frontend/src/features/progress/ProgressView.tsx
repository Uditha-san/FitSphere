import React from 'react'
import { Lock } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import CoachProgressView from './CoachProgressView'
import ClientProgressView from './ClientProgressView'
import GymAdminProgressView from './GymAdminProgressView'
import SuperAdminProgressView from './SuperAdminProgressView'

export const ProgressView: React.FC = () => {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated || !user) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-12 text-center shadow-xl space-y-4 max-w-lg mx-auto">
        <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
          <Lock className="h-7 w-7" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Authentication Required</h3>
          <p className="text-xs text-slate-400 mt-1.5">
            Please sign in to access client body composition and progress tracking.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in duration-200">
      {user.role === 'coach' && <CoachProgressView />}
      {user.role === 'client' && <ClientProgressView />}
      {user.role === 'gym_admin' && <GymAdminProgressView />}
      {user.role === 'super_admin' && <SuperAdminProgressView />}
    </div>
  )
}

export default ProgressView
