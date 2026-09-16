import React, { useState, useEffect } from 'react'
import {
  X,
  Scale,
  Percent,
  AlertCircle,
  Loader2,
  Check,
} from 'lucide-react'
import { progressApi } from '../../services/progressApi'
import { sessionApi } from '../../services/sessionApi'
import { trainingPlanApi } from '../../services/trainingPlanApi'
import type { ProgressRecord, ProgressRecordCreatePayload } from '../../types/progress'
import type { TrainingSession } from '../../types/session'
import type { TrainingPlanSummary } from '../../types/trainingPlan'
import type { User } from '../../types/auth'

interface CreateProgressRecordModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (newRecord: ProgressRecord) => void
  token: string
  clients: User[]
  preselectedClientId?: string
}

export const CreateProgressRecordModal: React.FC<CreateProgressRecordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  token,
  clients,
  preselectedClientId,
}) => {
  // Format local current datetime for input
  const getLocalDatetimeString = () => {
    const now = new Date()
    const offset = now.getTimezoneOffset() * 60000
    const localISOTime = new Date(now.getTime() - offset).toISOString().slice(0, 16)
    return localISOTime
  }

  const [clientId, setClientId] = useState(preselectedClientId || (clients[0]?.id || ''))
  const [recordedAt, setRecordedAt] = useState(getLocalDatetimeString())
  const [weightKg, setWeightKg] = useState<string>('')
  const [bodyFatPercentage, setBodyFatPercentage] = useState<string>('')
  const [chestCm, setChestCm] = useState<string>('')
  const [waistCm, setWaistCm] = useState<string>('')
  const [hipCm, setHipCm] = useState<string>('')
  const [armCm, setArmCm] = useState<string>('')
  const [thighCm, setThighCm] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [trainingSessionId, setTrainingSessionId] = useState<string>('')
  const [trainingPlanId, setTrainingPlanId] = useState<string>('')

  const [availableSessions, setAvailableSessions] = useState<TrainingSession[]>([])
  const [availablePlans, setAvailablePlans] = useState<TrainingPlanSummary[]>([])
  const [loadingLinks, setLoadingLinks] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (preselectedClientId) {
      setClientId(preselectedClientId)
    } else if (clients.length > 0 && !clientId) {
      setClientId(clients[0].id)
    }
  }, [preselectedClientId, clients])

  // When client changes, fetch that client's available sessions and training plans
  useEffect(() => {
    if (!isOpen || !clientId) return

    let cancelled = false
    setLoadingLinks(true)

    Promise.all([
      sessionApi.listSessions({ client_id: clientId, limit: 50 }, token).catch(() => []),
      trainingPlanApi.listPlans({ client_id: clientId, limit: 50 }, token).catch(() => []),
    ])
      .then(([sessions, plans]) => {
        if (!cancelled) {
          setAvailableSessions(sessions)
          setAvailablePlans(plans)
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingLinks(false)
      })

    return () => {
      cancelled = true
    }
  }, [isOpen, clientId, token])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!clientId) {
      setErrorMessage('Please select a client.')
      return
    }

    if (!recordedAt) {
      setErrorMessage('Please provide a date and time for the progress check-in.')
      return
    }

    // Convert local datetime input to timezone-aware ISO string
    const recordedDate = new Date(recordedAt)
    if (isNaN(recordedDate.getTime())) {
      setErrorMessage('Invalid date/time format.')
      return
    }
    const isoRecordedAt = recordedDate.toISOString()

    // Validation: at least one measurement or non-empty note must be supplied
    const hasWeight = weightKg.trim() !== ''
    const hasBodyFat = bodyFatPercentage.trim() !== ''
    const hasChest = chestCm.trim() !== ''
    const hasWaist = waistCm.trim() !== ''
    const hasHip = hipCm.trim() !== ''
    const hasArm = armCm.trim() !== ''
    const hasThigh = thighCm.trim() !== ''
    const hasNotes = notes.trim() !== ''

    if (!hasWeight && !hasBodyFat && !hasChest && !hasWaist && !hasHip && !hasArm && !hasThigh && !hasNotes) {
      setErrorMessage('Please record at least one measurement metric or qualitative note.')
      return
    }

    const payload: ProgressRecordCreatePayload = {
      client_id: clientId,
      recorded_at: isoRecordedAt,
      weight_kg: hasWeight ? parseFloat(weightKg) : null,
      body_fat_percentage: hasBodyFat ? parseFloat(bodyFatPercentage) : null,
      chest_cm: hasChest ? parseFloat(chestCm) : null,
      waist_cm: hasWaist ? parseFloat(waistCm) : null,
      hip_cm: hasHip ? parseFloat(hipCm) : null,
      arm_cm: hasArm ? parseFloat(armCm) : null,
      thigh_cm: hasThigh ? parseFloat(thighCm) : null,
      notes: hasNotes ? notes.trim() : null,
      training_session_id: trainingSessionId || null,
      training_plan_id: trainingPlanId || null,
    }

    setSubmitting(true)
    try {
      const created = await progressApi.createProgressRecord(payload, token)
      onSuccess(created)
      onClose()
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record progress check-in.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Log Client Progress Check-In</h2>
              <p className="text-xs text-slate-400">Record body measurements, composition & notes</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Row 1: Client & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Client *
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
                disabled={Boolean(preselectedClientId)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none disabled:opacity-60"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name || c.email} ({c.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Check-in Date & Time *
              </label>
              <input
                type="datetime-local"
                value={recordedAt}
                onChange={(e) => setRecordedAt(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Primary Body Composition Metrics */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Scale className="h-3.5 w-3.5 text-indigo-400" />
              <span>Weight & Body Composition</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Body Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="10"
                  max="500"
                  placeholder="e.g. 78.5"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Body Fat Percentage (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="e.g. 18.2"
                  value={bodyFatPercentage}
                  onChange={(e) => setBodyFatPercentage(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Body Circumferences */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Percent className="h-3.5 w-3.5 text-emerald-400" />
              <span>Circumferences (cm)</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Waist (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  min="20"
                  max="300"
                  placeholder="e.g. 82.0"
                  value={waistCm}
                  onChange={(e) => setWaistCm(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Chest (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  min="20"
                  max="300"
                  placeholder="e.g. 102.0"
                  value={chestCm}
                  onChange={(e) => setChestCm(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Hips (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  min="20"
                  max="300"
                  placeholder="e.g. 98.0"
                  value={hipCm}
                  onChange={(e) => setHipCm(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Arms (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  min="10"
                  max="150"
                  placeholder="e.g. 36.5"
                  value={armCm}
                  onChange={(e) => setArmCm(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Thighs (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  min="10"
                  max="200"
                  placeholder="e.g. 58.0"
                  value={thighCm}
                  onChange={(e) => setThighCm(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Optional Links: Session & Training Plan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Link to Training Session (Optional)
              </label>
              <select
                value={trainingSessionId}
                onChange={(e) => setTrainingSessionId(e.target.value)}
                disabled={loadingLinks}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="">-- No session linked --</option>
                {availableSessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {new Date(s.scheduled_start).toLocaleDateString()} - {s.session_type} ({s.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Link to Training Plan (Optional)
              </label>
              <select
                value={trainingPlanId}
                onChange={(e) => setTrainingPlanId(e.target.value)}
                disabled={loadingLinks}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="">-- No plan linked --</option>
                {availablePlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Qualitative Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Coaching Assessment / Notes
            </label>
            <textarea
              rows={3}
              placeholder="Notes on client energy, recovery, compliance, nutritional milestones..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Save Check-In</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
export default CreateProgressRecordModal
