import React, { useState, useEffect } from 'react'
import { X, Dumbbell, Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { assignmentApiService } from '../../services/assignmentApi'
import { trainingPlanApiService } from '../../services/trainingPlanApi'
import type { CoachClientAssignment } from '../../types/assignment'
import type { PlanStatus, TrainingPlan } from '../../types/trainingPlan'

interface CreateTrainingPlanModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (newPlan: TrainingPlan) => void
}

export const CreateTrainingPlanModal: React.FC<CreateTrainingPlanModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { token, user } = useAuth()
  const [name, setName] = useState('')
  const [clientId, setClientId] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<PlanStatus>('active')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [assignedClients, setAssignedClients] = useState<{ id: string; name: string; email: string }[]>([])
  const [isLoadingClients, setIsLoadingClients] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch only active assigned clients for this coach / gym
  useEffect(() => {
    if (!isOpen || !token) return

    const loadClients = async () => {
      setIsLoadingClients(true)
      setError(null)
      try {
        if (user?.role === 'coach') {
          const assignments: CoachClientAssignment[] = await assignmentApiService.listAssignments(
            { is_active: true },
            token
          )
          const clients = assignments
            .filter((a) => a.client && a.is_active)
            .map((a) => ({
              id: a.client_id,
              name: a.client?.full_name || 'Client',
              email: a.client?.email || '',
            }))
          setAssignedClients(clients)
          if (clients.length > 0) setClientId(clients[0].id)
        } else {
          // Gym admin or super admin can select from users with client role
          const users = await assignmentApiService.listUsers({ role: 'client' }, token)
          const clients = users.map((u) => ({
            id: u.id,
            name: u.full_name || 'Client',
            email: u.email,
          }))
          setAssignedClients(clients)
          if (clients.length > 0) setClientId(clients[0].id)
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load assigned clients')
      } finally {
        setIsLoadingClients(false)
      }
    }

    loadClients()
  }, [isOpen, token, user?.role])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    if (!name.trim()) {
      setError('Please provide a training plan name')
      return
    }
    if (!clientId) {
      setError('Please select an athlete/client')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const newPlan = await trainingPlanApiService.createPlan(
        {
          name: name.trim(),
          client_id: clientId,
          description: description.trim() || undefined,
          status,
          start_date: startDate ? new Date(startDate).toISOString() : undefined,
          end_date: endDate ? new Date(endDate).toISOString() : undefined,
        },
        token
      )
      onSuccess(newPlan)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to create training plan')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Create Training Plan</h3>
              <p className="text-xs text-slate-400">Design a structured workout plan for an assigned client</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2.5 text-xs text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Plan Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Plan Name *</label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 8-Week Hypertrophy & Power Split"
                required
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Client Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Assigned Athlete / Client *</span>
              {isLoadingClients && <span className="text-slate-500 text-[10px]">Loading clients...</span>}
            </label>
            <div className="relative">
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
                disabled={isLoadingClients || assignedClients.length === 0}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
              >
                {assignedClients.length === 0 ? (
                  <option value="">No assigned clients available</option>
                ) : (
                  assignedClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </option>
                  ))
                )}
              </select>
            </div>
            {assignedClients.length === 0 && !isLoadingClients && (
              <p className="text-[11px] text-amber-400">
                You do not have any actively assigned clients yet. You must be assigned to an athlete before creating a plan.
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Plan Objectives & Notes</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Focus on progressive overload and compound lifts with 60-90s rest..."
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Status & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Initial Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PlanStatus)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || assignedClients.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Plan...
                </>
              ) : (
                'Create Training Plan'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateTrainingPlanModal
