import React, { useState, useEffect, useCallback } from 'react'
import {
  ShieldCheck,
  Building2,
  Search,
  ChevronRight,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { assignmentApiService } from '../../services/assignmentApi'
import { trainingPlanApiService } from '../../services/trainingPlanApi'
import type { Tenant } from '../../types/assignment'
import type {
  TrainingPlan,
  TrainingPlanSummary,
  WorkoutDay,
} from '../../types/trainingPlan'
import TrainingPlanStatusBadge from './TrainingPlanStatusBadge'
import WorkoutCard from './WorkoutCard'
import { ExerciseDetailsModal } from '../exercises/ExerciseDetailsModal'

export const SuperAdminTrainingPlansView: React.FC = () => {
  const { user, token } = useAuth()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState<string>('all')
  const [plans, setPlans] = useState<TrainingPlanSummary[]>([])
  const [selectedPlan, setSelectedPlan] = useState<TrainingPlan | null>(null)
  const [viewingTechniqueId, setViewingTechniqueId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Fetch tenants on mount
  useEffect(() => {
    if (!token) return
    const fetchTenants = async () => {
      try {
        const data = await assignmentApiService.listTenants(token)
        setTenants(data)
      } catch (err) {
        console.error('Failed to load tenants', err)
      }
    }
    fetchTenants()
  }, [token])

  const loadPlans = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    try {
      const data = await trainingPlanApiService.listPlans(
        { tenant_id: selectedTenantId !== 'all' ? selectedTenantId : undefined },
        token
      )
      setPlans(data)
    } catch (err) {
      console.error('Failed to load platform plans', err)
    } finally {
      setIsLoading(false)
    }
  }, [token, selectedTenantId])

  useEffect(() => {
    loadPlans()
  }, [loadPlans])

  const openPlanDetails = async (id: string) => {
    if (!token) return
    try {
      const full = await trainingPlanApiService.getPlan(id, token)
      setSelectedPlan(full)
    } catch (err: any) {
      alert(err.message || 'Failed to fetch plan details')
    }
  }

  const filteredPlans = plans.filter((p) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      p.name.toLowerCase().includes(q) ||
      p.coach?.full_name?.toLowerCase().includes(q) ||
      p.client?.full_name?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-purple-900/40 via-slate-900 to-slate-900 p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="h-3.5 w-3.5" />
            Platform-Wide Governance
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Platform Training Plans
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
            Audit and inspect workout plans, exercise regimens, and coaching activity across all
            isolated gym facilities on the FitSphere platform.
          </p>
        </div>

        <button
          onClick={loadPlans}
          title="Refresh Plans"
          className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white hover:border-slate-700 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tenant Selector & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search platform plans by title, coach, or athlete..."
            className="w-full rounded-xl bg-slate-900/80 border border-slate-800 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        {/* Tenant Filter Dropdown */}
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-slate-400" />
          <select
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
            className="rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-xs font-medium text-white focus:outline-none focus:border-purple-500 transition-colors"
          >
            <option value="all">All Gym Facilities ({tenants.length})</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Plans Table */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-500 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-500" />
          <p className="text-sm">Loading platform training plans...</p>
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-800 p-12 text-center text-slate-400">
          No training plans found across the selected facilities.
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Plan Title</th>
                <th className="px-5 py-3.5">Facility / Gym ID</th>
                <th className="px-5 py-3.5">Coach</th>
                <th className="px-5 py-3.5">Client</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Workouts</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredPlans.map((plan: TrainingPlanSummary) => (
                <tr
                  key={plan.id}
                  className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                  onClick={() => openPlanDetails(plan.id)}
                >
                  <td className="px-5 py-4 font-semibold text-white group-hover:text-purple-400 transition-colors">
                    {plan.name}
                  </td>
                  <td className="px-5 py-4 text-slate-400 font-mono text-[11px]">
                    {plan.tenant_id.slice(0, 8)}...
                  </td>
                  <td className="px-5 py-4 text-slate-300">
                    {plan.coach?.full_name || 'Coach'}
                  </td>
                  <td className="px-5 py-4 text-slate-300">
                    {plan.client?.full_name || 'Client'}
                  </td>
                  <td className="px-5 py-4">
                    <TrainingPlanStatusBadge status={plan.status} />
                  </td>
                  <td className="px-5 py-4 text-slate-400">
                    {plan.days_count} days
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openPlanDetails(plan.id)
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
                    >
                      Audit
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Plan Inspector Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <TrainingPlanStatusBadge status={selectedPlan.status} />
                  <span className="text-xs text-slate-400">
                    Tenant: {selectedPlan.tenant_id}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white">{selectedPlan.name}</h3>
              </div>
              <button
                onClick={() => setSelectedPlan(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-950/50 border border-slate-800 text-xs">
              <div>
                <div className="text-[10px] uppercase font-semibold text-slate-500">Coach</div>
                <div className="font-semibold text-white mt-0.5">{selectedPlan.coach?.full_name}</div>
                <div className="text-slate-400">{selectedPlan.coach?.email}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-semibold text-slate-500">Athlete</div>
                <div className="font-semibold text-white mt-0.5">{selectedPlan.client?.full_name}</div>
                <div className="text-slate-400">{selectedPlan.client?.email}</div>
              </div>
            </div>

            {selectedPlan.description && (
              <p className="text-xs text-slate-300">{selectedPlan.description}</p>
            )}

            <div className="space-y-4">
              <h4 className="text-sm font-bold text-white">Workout Days ({selectedPlan.workout_days.length})</h4>
              {selectedPlan.workout_days.length === 0 ? (
                <div className="text-xs text-slate-500 italic p-4 text-center border border-dashed border-slate-800 rounded-xl">
                  No workout days added yet.
                </div>
              ) : (
                selectedPlan.workout_days.map((day: WorkoutDay) => (
                  <WorkoutCard
                    key={day.id}
                    day={day}
                    canEdit={false}
                    onViewExerciseTechnique={(exId) => setViewingTechniqueId(exId)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
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

export default SuperAdminTrainingPlansView
