import React, { useState, useEffect } from 'react'
import { X, UserPlus, AlertCircle, Loader2 } from 'lucide-react'
import type { CoachClientAssignment } from '../../../types/assignment'
import type { User } from '../../../types/auth'
import { assignmentApiService } from '../../../services/assignmentApi'
import { useAuth } from '../../../context/AuthContext'

interface CreateAssignmentModalProps {
  isOpen: boolean
  tenantId?: string | null
  onClose: () => void
  onSuccess: (newAssignment: CoachClientAssignment) => void
}

export const CreateAssignmentModal: React.FC<CreateAssignmentModalProps> = ({
  isOpen,
  tenantId,
  onClose,
  onSuccess,
}) => {
  const { token, user: currentUser } = useAuth()
  const [coaches, setCoaches] = useState<User[]>([])
  const [clients, setClients] = useState<User[]>([])
  const [selectedCoachId, setSelectedCoachId] = useState<string>('')
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [formError, setFormError] = useState<string | null>(null)

  const effectiveTenantId = tenantId || currentUser?.tenant_id || undefined

  useEffect(() => {
    if (!isOpen || !token) return

    const loadGymUsers = async () => {
      setIsLoadingUsers(true)
      setFormError(null)
      try {
        const users = await assignmentApiService.listUsers(
          { tenant_id: effectiveTenantId },
          token
        )
        const gymCoaches = users.filter((u) => u.role === 'coach' && u.is_active)
        const gymClients = users.filter((u) => u.role === 'client' && u.is_active)
        setCoaches(gymCoaches)
        setClients(gymClients)

        if (gymCoaches.length > 0) setSelectedCoachId(gymCoaches[0].id)
        if (gymClients.length > 0) setSelectedClientId(gymClients[0].id)
      } catch (err: any) {
        setFormError(err.message || 'Failed to fetch gym members')
      } finally {
        setIsLoadingUsers(false)
      }
    }

    loadGymUsers()
  }, [isOpen, token, effectiveTenantId])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    if (!selectedCoachId || !selectedClientId) {
      setFormError('Please select both an active coach and client.')
      return
    }

    setIsSubmitting(true)
    setFormError(null)

    try {
      const payload = {
        coach_id: selectedCoachId,
        client_id: selectedClientId,
        ...(effectiveTenantId ? { tenant_id: effectiveTenantId } : {}),
      }
      const newAssignment = await assignmentApiService.createAssignment(payload, token)
      onSuccess(newAssignment)
      onClose()
    } catch (err: any) {
      setFormError(err.message || 'Failed to create assignment')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Assign Coach to Client</h3>
              <p className="text-xs text-slate-400">Link an active coach with an active athlete</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {formError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Assignment Error:</span> {formError}
            </div>
          </div>
        )}

        {isLoadingUsers ? (
          <div className="py-10 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
            <span>Loading gym roster...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Select Coach <span className="text-indigo-400">*</span>
              </label>
              <select
                value={selectedCoachId}
                onChange={(e) => setSelectedCoachId(e.target.value)}
                disabled={coaches.length === 0 || isSubmitting}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition disabled:opacity-50"
              >
                {coaches.length === 0 ? (
                  <option value="">No active coaches available</option>
                ) : (
                  coaches.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name ? `${c.full_name} (${c.email})` : c.email}
                    </option>
                  ))
                )}
              </select>
              {coaches.length === 0 && (
                <p className="text-xs text-amber-400/80 mt-1">
                  Please register an active coach in this gym first.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Select Client <span className="text-indigo-400">*</span>
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                disabled={clients.length === 0 || isSubmitting}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition disabled:opacity-50"
              >
                {clients.length === 0 ? (
                  <option value="">No active clients available</option>
                ) : (
                  clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name ? `${c.full_name} (${c.email})` : c.email}
                    </option>
                  ))
                )}
              </select>
              {clients.length === 0 && (
                <p className="text-xs text-amber-400/80 mt-1">
                  Please register an active client in this gym first.
                </p>
              )}
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400">
              <span className="text-slate-300 font-medium">Validation Rule:</span> A client can only have one active assignment per coach. Submitting an active pair will be enforced safely by the server.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-medium rounded-lg text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || coaches.length === 0 || clients.length === 0}
                className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirm Assignment
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default CreateAssignmentModal
