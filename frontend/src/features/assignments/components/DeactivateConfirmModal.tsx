import React from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import type { CoachClientAssignment } from '../../../types/assignment'

interface DeactivateConfirmModalProps {
  isOpen: boolean
  assignment: CoachClientAssignment | null
  isLoading: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}

export const DeactivateConfirmModal: React.FC<DeactivateConfirmModalProps> = ({
  isOpen,
  assignment,
  isLoading,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !assignment) return null

  const coachName = assignment.coach?.full_name || assignment.coach?.email || assignment.coach_id.slice(0, 8)
  const clientName = assignment.client?.full_name || assignment.client?.email || assignment.client_id.slice(0, 8)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0 text-rose-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Deactivate Assignment?</h3>
            <p className="text-xs text-slate-400 mt-1">
              Are you sure you want to deactivate the link between:
            </p>
            <div className="mt-2.5 p-3 rounded-lg bg-slate-950/50 border border-slate-800 text-xs space-y-1">
              <div>
                <span className="text-slate-400">Coach: </span>
                <span className="font-semibold text-white">{coachName}</span>
              </div>
              <div>
                <span className="text-slate-400">Client: </span>
                <span className="font-semibold text-white">{clientName}</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2.5">
              The client will no longer appear in the coach's active roster. The audit history will be preserved.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-medium rounded-lg text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 transition disabled:opacity-50 cursor-pointer"
          >
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Confirm Deactivation
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeactivateConfirmModal
