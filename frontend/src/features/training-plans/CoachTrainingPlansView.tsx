import React, { useState, useEffect, useCallback } from 'react'
import {
  Dumbbell,
  Plus,
  Calendar,
  ChevronRight,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Archive,
  CheckCircle2,
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
import CreateTrainingPlanModal from './CreateTrainingPlanModal'
import { AddDayModal, AddExerciseModal } from './WorkoutEditorModal'
import { ExerciseDetailsModal } from '../exercises/ExerciseDetailsModal'

export const CoachTrainingPlansView: React.FC = () => {
  const { user, token } = useAuth()
  const [plans, setPlans] = useState<TrainingPlanSummary[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<TrainingPlan | null>(null)
  const [isLoadingList, setIsLoadingList] = useState(true)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isAddDayOpen, setIsAddDayOpen] = useState(false)
  const [activeDayIdForExercise, setActiveDayIdForExercise] = useState<string | null>(null)
  const [viewingTechniqueId, setViewingTechniqueId] = useState<string | null>(null)

  const loadPlans = useCallback(async () => {
    if (!token) return
    setIsLoadingList(true)
    setError(null)
    try {
      const data = await trainingPlanApiService.listPlans({}, token)
      setPlans(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load training plans')
    } finally {
      setIsLoadingList(false)
    }
  }, [token])

  const loadPlanDetails = useCallback(async (id: string) => {
    if (!token) return
    setIsLoadingDetails(true)
    try {
      const data = await trainingPlanApiService.getPlan(id, token)
      setSelectedPlan(data)
    } catch (err: any) {
      console.error('Failed to load plan details', err)
    } finally {
      setIsLoadingDetails(false)
    }
  }, [token])

  useEffect(() => {
    loadPlans()
  }, [loadPlans])

  useEffect(() => {
    if (selectedPlanId) {
      loadPlanDetails(selectedPlanId)
    } else {
      setSelectedPlan(null)
    }
  }, [selectedPlanId, loadPlanDetails])

  // Handlers for plan mutations
  const handleArchivePlan = async (id: string) => {
    if (!token) return
    try {
      const updated = await trainingPlanApiService.archivePlan(id, token)
      setSelectedPlan(updated)
      loadPlans()
    } catch (err: any) {
      alert(err.message || 'Failed to archive plan')
    }
  }

  const handleActivatePlan = async (id: string) => {
    if (!token) return
    try {
      const updated = await trainingPlanApiService.updatePlan(id, { status: 'active' }, token)
      setSelectedPlan(updated)
      loadPlans()
    } catch (err: any) {
      alert(err.message || 'Failed to activate plan')
    }
  }

  const handleDeleteDay = async (dayId: string) => {
    if (!token || !selectedPlanId) return
    if (!confirm('Are you sure you want to delete this workout day and all its exercises?')) return
    try {
      await trainingPlanApiService.deleteWorkoutDay(dayId, token)
      loadPlanDetails(selectedPlanId)
    } catch (err: any) {
      alert(err.message || 'Failed to delete workout day')
    }
  }

  const handleDeleteExercise = async (exerciseId: string) => {
    if (!token || !selectedPlanId) return
    try {
      await trainingPlanApiService.deleteExercise(exerciseId, token)
      loadPlanDetails(selectedPlanId)
    } catch (err: any) {
      alert(err.message || 'Failed to delete exercise')
    }
  }

  // --- Render Details View when a plan is selected ---
  if (selectedPlanId) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Top Back Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedPlanId(null)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Training Plans
          </button>

          <div className="flex items-center gap-2">
            {selectedPlan?.status !== 'active' && (
              <button
                onClick={() => selectedPlan && handleActivatePlan(selectedPlan.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all cursor-pointer"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Activate Plan
              </button>
            )}

            {selectedPlan?.status !== 'archived' && (
              <button
                onClick={() => selectedPlan && handleArchivePlan(selectedPlan.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                <Archive className="h-3.5 w-3.5" />
                Archive Plan
              </button>
            )}
          </div>
        </div>

        {isLoadingDetails || !selectedPlan ? (
          <div className="py-20 text-center text-slate-500 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-500" />
            <p className="text-sm">Loading workout plan details...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Plan Hero Banner */}
            <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 p-6 sm:p-8 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <TrainingPlanStatusBadge status={selectedPlan.status} />
                    <span className="text-xs text-slate-400">
                      Created {new Date(selectedPlan.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    {selectedPlan.name}
                  </h2>
                  {selectedPlan.description && (
                    <p className="text-sm text-slate-300 max-w-2xl">{selectedPlan.description}</p>
                  )}
                </div>

                {/* Athlete Card */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 shrink-0 sm:min-w-[220px]">
                  <div className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider mb-2">
                    Assigned Athlete
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm">
                      {selectedPlan.client?.full_name?.charAt(0) || 'C'}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {selectedPlan.client?.full_name || 'Client'}
                      </div>
                      <div className="text-xs text-slate-400">{selectedPlan.client?.email}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Workout Days Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    Workout Days & Routines
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedPlan.workout_days.length} workout session(s) scheduled in this plan
                  </p>
                </div>

                <button
                  onClick={() => setIsAddDayOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Add Workout Day
                </button>
              </div>

              {selectedPlan.workout_days.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-800 p-12 text-center space-y-4">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">No workout days created yet</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Structure your athlete's training split by adding workout days (e.g. Day 1: Push, Day 2: Pull).
                    </p>
                  </div>
                  <button
                    onClick={() => setIsAddDayOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    Create First Workout Day
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedPlan.workout_days.map((day: WorkoutDay) => (
                    <WorkoutCard
                      key={day.id}
                      day={day}
                      canEdit={true}
                      onAddExercise={(dayId) => setActiveDayIdForExercise(dayId)}
                      onDeleteDay={handleDeleteDay}
                      onDeleteExercise={handleDeleteExercise}
                      onViewExerciseTechnique={(exId) => setViewingTechniqueId(exId)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add Day Modal */}
        {selectedPlan && (
          <AddDayModal
            isOpen={isAddDayOpen}
            planId={selectedPlan.id}
            onClose={() => setIsAddDayOpen(false)}
            onSuccess={() => loadPlanDetails(selectedPlan.id)}
          />
        )}

        {/* Add Exercise Modal */}
        {activeDayIdForExercise && (
          <AddExerciseModal
            isOpen={!!activeDayIdForExercise}
            dayId={activeDayIdForExercise}
            onClose={() => setActiveDayIdForExercise(null)}
            onSuccess={() => {
              if (selectedPlanId) loadPlanDetails(selectedPlanId)
            }}
          />
        )}

        {/* Exercise Technique Modal */}
        {viewingTechniqueId && (
          <ExerciseDetailsModal
            isOpen={!!viewingTechniqueId}
            exerciseId={viewingTechniqueId}
            currentUser={user}
            token={token}
            onClose={() => setViewingTechniqueId(null)}
          />
        )}
      </div>
    )
  }

  // --- Render Plans List ---
  const activeCount = plans.filter((p) => p.status === 'active').length
  const draftCount = plans.filter((p) => p.status === 'draft').length
  const archivedCount = plans.filter((p) => p.status === 'archived').length

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-indigo-900/40 via-slate-900 to-slate-900 p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <Dumbbell className="h-3.5 w-3.5" />
            Coach Training Management
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            My Training Plans
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
            Design, schedule, and assign progressive training routines and workout days for your
            actively assigned athletes.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={loadPlans}
            title="Refresh Training Plans"
            className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingList ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            New Training Plan
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg space-y-1">
          <span className="text-xs font-medium text-slate-400">Total Plans Created</span>
          <div className="text-2xl font-bold text-white">{plans.length}</div>
          <div className="text-[11px] text-slate-500">Across all assigned clients</div>
        </div>

        <div className="rounded-2xl border border-emerald-900/20 bg-emerald-950/10 p-5 shadow-lg space-y-1">
          <span className="text-xs font-medium text-emerald-400">Active Published Plans</span>
          <div className="text-2xl font-bold text-emerald-300">{activeCount}</div>
          <div className="text-[11px] text-emerald-500/80">Currently being followed</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg space-y-1">
          <span className="text-xs font-medium text-amber-400">Draft / In-Progress</span>
          <div className="text-2xl font-bold text-amber-300">{draftCount}</div>
          <div className="text-[11px] text-slate-500">{archivedCount} archived</div>
        </div>
      </div>

      {/* Plans List */}
      {isLoadingList ? (
        <div className="py-20 text-center text-slate-500 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-500" />
          <p className="text-sm">Loading training plans...</p>
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-8 text-center text-rose-400 space-y-2">
          <p className="font-semibold">{error}</p>
          <button
            onClick={loadPlans}
            className="text-xs text-rose-300 underline hover:text-white"
          >
            Retry Loading
          </button>
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-800 p-12 text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto">
            <Dumbbell className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">No Training Plans Yet</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              You haven't created any workout plans for your assigned athletes yet. Click below to
              design your first custom training routine.
            </p>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Create Training Plan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {plans.map((plan: TrainingPlanSummary) => (
            <div
              key={plan.id}
              onClick={() => setSelectedPlanId(plan.id)}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg hover:border-indigo-500/50 hover:bg-slate-900 transition-all cursor-pointer space-y-4 group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <TrainingPlanStatusBadge status={plan.status} />
                  <span className="text-[11px] text-slate-500 font-medium">
                    {plan.days_count} workout day(s)
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors">
                    {plan.name}
                  </h4>
                  {plan.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                      {plan.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-[11px] font-bold text-indigo-400">
                    {plan.client?.full_name?.charAt(0) || 'C'}
                  </div>
                  <span className="text-slate-300 font-medium">
                    {plan.client?.full_name || 'Client'}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-slate-500 group-hover:text-indigo-400 transition-colors">
                  <span>Manage</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Plan Modal */}
      <CreateTrainingPlanModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          loadPlans()
        }}
      />
    </div>
  )
}

export default CoachTrainingPlansView
