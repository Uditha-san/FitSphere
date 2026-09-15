import React from 'react'
import { Lock } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import CoachTrainingPlansView from './CoachTrainingPlansView'
import ClientTrainingPlanView from './ClientTrainingPlanView'
import GymAdminTrainingPlansView from './GymAdminTrainingPlansView'
import SuperAdminTrainingPlansView from './SuperAdminTrainingPlansView'

export const TrainingPlansView: React.FC = () => {
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
            Please sign in to access your workout training plans and exercise routines.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in duration-200">
      {user.role === 'coach' && <CoachTrainingPlansView />}
      {user.role === 'client' && <ClientTrainingPlanView />}
      {user.role === 'gym_admin' && <GymAdminTrainingPlansView />}
      {user.role === 'super_admin' && <SuperAdminTrainingPlansView />}
    </div>
  )
}

export default TrainingPlansView
