import React, { useState, useEffect } from 'react'
import {
  X,
  Calendar,
  Dumbbell,
  AlertCircle,
  Loader2,
  CheckCircle,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { assignmentApi } from '../../services/assignmentApi'
import { trainingPlanApi } from '../../services/trainingPlanApi'
import { sessionApi } from '../../services/sessionApi'
import type { CoachClientAssignment } from '../../types/assignment'
import type { TrainingPlanSummary, WorkoutDay } from '../../types/trainingPlan'
import type { SessionCreatePayload, SessionType } from '../../types/session'

interface CreateSessionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const CreateSessionModal: React.FC<CreateSessionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user, token } = useAuth()

  // Form State
  const [selectedCoachId, setSelectedCoachId] = useState<string>('')
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [sessionType, setSessionType] = useState<SessionType>('personal_training')
  const [startDate, setStartDate] = useState<string>('')
  const [startTime, setStartTime] = useState<string>('10:00')
  const [endDate, setEndDate] = useState<string>('')
  const [endTime, setEndTime] = useState<string>('11:00')
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')
  const [selectedDayId, setSelectedDayId] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  // Data Source State
  const [assignments, setAssignments] = useState<CoachClientAssignment[]>([])
  const [plans, setPlans] = useState<TrainingPlanSummary[]>([])
  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[]>([])

  // UI State
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false)
  const [isLoadingPlans, setIsLoadingPlans] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize default dates: Tomorrow 10:00 AM - 11:00 AM
  useEffect(() => {
    if (isOpen) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dateStr = tomorrow.toISOString().split('T')[0]
      setStartDate(dateStr)
      setEndDate(dateStr)
      setStartTime('10:00')
      setEndTime('11:00')
      setError(null)
      setSelectedPlanId('')
      setSelectedDayId('')
      setNotes('')
    }
  }, [isOpen])

  // Fetch active coach-client assignments
  useEffect(() => {
    if (!isOpen || !token || !user) return

    const fetchAssignments = async () => {
      setIsLoadingAssignments(true)
      try {
        const filter: any = { is_active: true }
        if (user.role === 'coach') {
          filter.coach_id = user.id
          setSelectedCoachId(user.id)
        }
        const data = await assignmentApi.listAssignments(filter, token)
        setAssignments(data)

        if (data.length > 0 && !selectedClientId) {
          setSelectedClientId(data[0].client_id)
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load assigned clients')
      } finally {
        setIsLoadingAssignments(false)
      }
    }

    fetchAssignments()
  }, [isOpen, token, user])

  // When client changes, fetch active plans for coach & client
  useEffect(() => {
    if (!token || !selectedClientId) {
      setPlans([])
      setSelectedPlanId('')
      setWorkoutDays([])
      setSelectedDayId('')
      return
    }

    const effectiveCoachId = user?.role === 'coach' ? user.id : selectedCoachId
    const fetchPlans = async () => {
      setIsLoadingPlans(true)
      try {
        const data = await trainingPlanApi.listPlans(
          {
            client_id: selectedClientId,
            coach_id: effectiveCoachId || undefined,
            status: 'active',
          },
          token
        )
        setPlans(data)
        if (data.length > 0) {
          setSelectedPlanId(data[0].id)
        } else {
          setSelectedPlanId('')
          setWorkoutDays([])
          setSelectedDayId('')
        }
      } catch (err: any) {
        console.error('Failed to load plans for client', err)
      } finally {
        setIsLoadingPlans(false)
      }
    }

    fetchPlans()
  }, [selectedClientId, selectedCoachId, token, user])

  // When selectedPlanId changes, fetch plan details to populate workout days
  useEffect(() => {
    if (!token || !selectedPlanId) {
      setWorkoutDays([])
      setSelectedDayId('')
      return
    }

    const fetchDays = async () => {
      try {
        const planDetail = await trainingPlanApi.getPlan(selectedPlanId, token)
        setWorkoutDays(planDetail.workout_days || [])
        if (planDetail.workout_days && planDetail.workout_days.length > 0) {
          setSelectedDayId(planDetail.workout_days[0].id)
        } else {
          setSelectedDayId('')
        }
      } catch (err: any) {
        console.error('Failed to fetch plan days', err)
      }
    }

    fetchDays()
  }, [selectedPlanId, token])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !user) return

    setError(null)

    if (!selectedClientId) {
      setError('Please select an athlete or client.')
      return
    }

    const startIso = new Date(`${startDate}T${startTime}:00`).toISOString()
    const endIso = new Date(`${endDate}T${endTime}:00`).toISOString()

    if (new Date(endIso) <= new Date(startIso)) {
      setError('Scheduled end time must be later than start time.')
      return
    }

    setIsSubmitting(true)
    try {
      const payload: SessionCreatePayload = {
        client_id: selectedClientId,
        coach_id: user.role === 'coach' ? user.id : selectedCoachId,
        scheduled_start: startIso,
        scheduled_end: endIso,
        session_type: sessionType,
        notes: notes.trim() || null,
        training_plan_id: selectedPlanId || null,
        workout_day_id: selectedDayId || null,
      }

      await sessionApi.createSession(payload, token)
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to schedule session.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Derived unique clients from assignments
  const clientOptions = assignments.map((a) => ({
    id: a.client_id,
    name: a.client?.full_name || a.client?.email || a.client_id,
    email: a.client?.email,
  }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Schedule Training Session</h2>
              <p className="text-xs text-slate-400">
                Book a session with an assigned athlete and optional workout plan.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Athlete / Client Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Athlete / Client <span className="text-rose-400">*</span>
            </label>
            {isLoadingAssignments ? (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                <span>Loading assigned athletes...</span>
              </div>
            ) : clientOptions.length === 0 ? (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                No actively assigned athletes found. Please assign an athlete first before scheduling sessions.
              </div>
            ) : (
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
              >
                {clientOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.email})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Session Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Session Type
            </label>
            <select
              value={sessionType}
              onChange={(e) => setSessionType(e.target.value as SessionType)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="personal_training">1-on-1 Personal Training</option>
              <option value="group_training">Group Training</option>
              <option value="assessment">Fitness Assessment</option>
              <option value="consultation">Consultation & Goal Setting</option>
            </select>
          </div>

          {/* Start Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Start Date <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  if (!endDate || endDate < e.target.value) {
                    setEndDate(e.target.value)
                  }
                }}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Start Time <span className="text-rose-400">*</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* End Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                End Date <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                End Time <span className="text-rose-400">*</span>
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Optional Training Plan Link */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
              <Dumbbell className="h-4 w-4" />
              <span>Link Training Plan (Optional)</span>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1.5">
                {isLoadingPlans && <Loader2 className="h-3 w-3 animate-spin text-indigo-400" />}
                <span>Active Training Plan</span>
              </label>
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value="">No training plan attached</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedPlanId && workoutDays.length > 0 && (
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Specific Workout Routine / Day
                </label>
                <select
                  value={selectedDayId}
                  onChange={(e) => setSelectedDayId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="">General session for this plan</option>
                  {workoutDays.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.exercises?.length || 0} exercises)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Coaching Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Coaching Notes / Focus
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Focus on chest press technique, form check on squats..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500 placeholder:text-slate-600 resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || clientOptions.length === 0}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Scheduling...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>Confirm Schedule</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateSessionModal
