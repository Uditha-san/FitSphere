import React, { useState, useEffect, useCallback } from 'react'
import {
  Dumbbell,
  Award,
  Loader2,
  RefreshCw,
  Info,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { trainingPlanApiService } from '../../services/trainingPlanApi'
import type {
  TrainingPlan,
  TrainingPlanSummary,
  WorkoutDay,
} from '../../types/trainingPlan'
import TrainingPlanStatusBadge from './TrainingPlanStatusBadge'
import WorkoutCard from './WorkoutCard'

export const ClientTrainingPlanView: React.FC = () => {
  const { token } = useAuth()
  const [plans, setPlans] = useState<TrainingPlanSummary[]>([])
  const [activePlan, setActivePlan] = useState<TrainingPlan | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const loadClientPlans = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    setError(null)
    try {
      const summaries = await trainingPlanApiService.listPlans({}, token)
      setPlans(summaries)

      // Find first active plan, or first available plan
      const current = summaries.find((p) => p.status === 'active') || summaries[0]
      if (current) {
        const full = await trainingPlanApiService.getPlan(current.id, token)
        setActivePlan(full)
      } else {
        setActivePlan(null)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load your training plan')
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadClientPlans()
  }, [loadClientPlans])

  const selectPlan = async (id: string) => {
    if (!token) return
    setIsLoading(true)
    try {
      const full = await trainingPlanApiService.getPlan(id, token)
      setActivePlan(full)
    } catch (err: any) {
      console.error('Failed to load plan details', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-emerald-950/30 via-slate-900 to-slate-900 p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <Award className="h-3.5 w-3.5" />
            Athlete Portal
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            My Training Plan
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
            Follow your personalized training split, review exercise technique notes, target sets,
            reps, and rest periods prescribed by your coach.
          </p>
        </div>

        <button
          onClick={loadClientPlans}
          title="Refresh Plan"
          className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white hover:border-slate-700 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-slate-500 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-500" />
          <p className="text-sm">Loading your workout routine...</p>
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-8 text-center text-rose-400 space-y-2">
          <p className="font-semibold">{error}</p>
          <button
            onClick={loadClientPlans}
            className="text-xs text-rose-300 underline hover:text-white"
          >
            Retry Loading
          </button>
        </div>
      ) : !activePlan ? (
        <div className="rounded-3xl border border-dashed border-slate-800 p-12 text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
            <Dumbbell className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">No Active Training Plan Assigned</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Your personal coach hasn't published an active workout routine for you yet. Your
              routine will appear here automatically once ready.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Plan Switcher if athlete has multiple plans */}
          {plans.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs font-semibold text-slate-400 shrink-0">Your Plans:</span>
              {plans.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectPlan(p.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer ${
                    p.id === activePlan.id
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}

          {/* Active Plan Overview Card */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <TrainingPlanStatusBadge status={activePlan.status} />
                  <span className="text-xs text-slate-400">
                    {activePlan.workout_days.length} Workout Days
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-white tracking-tight">{activePlan.name}</h3>
                {activePlan.description && (
                  <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
                    {activePlan.description}
                  </p>
                )}
              </div>

              {/* Coach Profile Badge */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 shrink-0 sm:min-w-[220px]">
                <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider mb-2">
                  Prescribed By Coach
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
                    {activePlan.coach?.full_name?.charAt(0) || 'C'}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {activePlan.coach?.full_name || 'Personal Coach'}
                    </div>
                    <div className="text-xs text-slate-400">{activePlan.coach?.email}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Read-Only Notice */}
            <div className="flex items-center gap-2 text-xs text-slate-400 pt-3 border-t border-slate-800/80">
              <Info className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>
                This training plan is prescribed by your certified trainer. Workout progress and
                exercise notes are synchronized in real-time.
              </span>
            </div>
          </div>

          {/* Workout Days */}
          <div className="space-y-4">
            <h4 className="text-lg font-bold text-white tracking-tight">Workout Days</h4>

            {activePlan.workout_days.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-400">
                No exercises have been scheduled in this plan yet. Check back soon!
              </div>
            ) : (
              <div className="space-y-4">
                {activePlan.workout_days.map((day: WorkoutDay) => (
                  <WorkoutCard key={day.id} day={day} canEdit={false} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ClientTrainingPlanView
