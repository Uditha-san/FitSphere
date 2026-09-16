import React, { useState } from 'react'
import {
  X,
  Scale,
  Percent,
  AlertCircle,
  Loader2,
  Check,
  Edit2,
} from 'lucide-react'
import { progressApi } from '../../services/progressApi'
import type { ProgressRecord, ProgressRecordUpdatePayload } from '../../types/progress'

interface EditProgressRecordModalProps {
  isOpen: boolean
  record: ProgressRecord | null
  onClose: () => void
  onSuccess: (updatedRecord: ProgressRecord) => void
  token: string
}

export const EditProgressRecordModal: React.FC<EditProgressRecordModalProps> = ({
  isOpen,
  record,
  onClose,
  onSuccess,
  token,
}) => {
  if (!isOpen || !record) return null

  const [weightKg, setWeightKg] = useState<string>(
    record.weight_kg !== null && record.weight_kg !== undefined ? String(record.weight_kg) : ''
  )
  const [bodyFatPercentage, setBodyFatPercentage] = useState<string>(
    record.body_fat_percentage !== null && record.body_fat_percentage !== undefined
      ? String(record.body_fat_percentage)
      : ''
  )
  const [chestCm, setChestCm] = useState<string>(
    record.chest_cm !== null && record.chest_cm !== undefined ? String(record.chest_cm) : ''
  )
  const [waistCm, setWaistCm] = useState<string>(
    record.waist_cm !== null && record.waist_cm !== undefined ? String(record.waist_cm) : ''
  )
  const [hipCm, setHipCm] = useState<string>(
    record.hip_cm !== null && record.hip_cm !== undefined ? String(record.hip_cm) : ''
  )
  const [armCm, setArmCm] = useState<string>(
    record.arm_cm !== null && record.arm_cm !== undefined ? String(record.arm_cm) : ''
  )
  const [thighCm, setThighCm] = useState<string>(
    record.thigh_cm !== null && record.thigh_cm !== undefined ? String(record.thigh_cm) : ''
  )
  const [notes, setNotes] = useState<string>(record.notes || '')

  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    const payload: ProgressRecordUpdatePayload = {
      weight_kg: weightKg.trim() !== '' ? parseFloat(weightKg) : null,
      body_fat_percentage: bodyFatPercentage.trim() !== '' ? parseFloat(bodyFatPercentage) : null,
      chest_cm: chestCm.trim() !== '' ? parseFloat(chestCm) : null,
      waist_cm: waistCm.trim() !== '' ? parseFloat(waistCm) : null,
      hip_cm: hipCm.trim() !== '' ? parseFloat(hipCm) : null,
      arm_cm: armCm.trim() !== '' ? parseFloat(armCm) : null,
      thigh_cm: thighCm.trim() !== '' ? parseFloat(thighCm) : null,
      notes: notes.trim() !== '' ? notes.trim() : null,
    }

    setSubmitting(true)
    try {
      const updated = await progressApi.updateProgressRecord(record.id, payload, token)
      onSuccess(updated)
      onClose()
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update progress record.')
    } finally {
      setSubmitting(false)
    }
  }

  const dateStr = new Date(record.recorded_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Edit2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Edit Progress Check-In</h2>
              <p className="text-xs text-slate-400">
                {record.client?.full_name || 'Client'} • {dateStr}
              </p>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Metrics Grid */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Scale className="h-3.5 w-3.5 text-indigo-400" />
              <span>Weight & Body Fat</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  min="10"
                  max="500"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Body Fat (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={bodyFatPercentage}
                  onChange={(e) => setBodyFatPercentage(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Circumferences */}
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
                  value={thighCm}
                  onChange={(e) => setThighCm(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Qualitative Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Assessment Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Footer */}
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
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
export default EditProgressRecordModal
