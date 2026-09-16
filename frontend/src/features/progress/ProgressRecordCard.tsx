import React from 'react'
import {
  Calendar,
  Clock,
  User as UserIcon,
  Scale,
  Percent,
  Dumbbell,
  FileText,
  Edit2,
  Trash2,
} from 'lucide-react'
import type { ProgressRecord } from '../../types/progress'

interface ProgressRecordCardProps {
  record: ProgressRecord
  canManage?: boolean
  showClient?: boolean
  showCoach?: boolean
  onEdit?: (record: ProgressRecord) => void
  onDelete?: (record: ProgressRecord) => void
}

export const ProgressRecordCard: React.FC<ProgressRecordCardProps> = ({
  record,
  canManage = false,
  showClient = true,
  showCoach = false,
  onEdit,
  onDelete,
}) => {
  const date = new Date(record.recorded_at)
  const dateStr = date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const timeStr = date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="group rounded-2xl border border-slate-800 bg-slate-900/70 p-5 hover:border-slate-700 hover:bg-slate-900 transition-all duration-200 shadow-lg flex flex-col justify-between">
      <div>
        {/* Header: Date, Time & Actions */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Calendar className="h-4 w-4 text-indigo-400" />
              <span>{dateStr}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              <span>{timeStr}</span>
            </div>
          </div>

          {canManage && (
            <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(record)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  title="Edit measurements"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(record)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  title="Delete record"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Client & Coach info if applicable */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mb-4 pb-3 border-b border-slate-800/80">
          {showClient && record.client && (
            <div className="flex items-center gap-1.5">
              <UserIcon className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-slate-200 font-medium">{record.client.full_name || record.client.email}</span>
            </div>
          )}
          {showCoach && record.coach && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Coach:</span>
              <span className="text-slate-300 font-medium">{record.coach.full_name || record.coach.email}</span>
            </div>
          )}
        </div>

        {/* Primary Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/60">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
              <Scale className="h-3.5 w-3.5 text-indigo-400" />
              <span>Weight</span>
            </div>
            <div className="text-lg font-black text-white">
              {record.weight_kg !== undefined && record.weight_kg !== null
                ? `${Number(record.weight_kg).toFixed(1)} kg`
                : '—'}
            </div>
          </div>

          <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/60">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
              <Percent className="h-3.5 w-3.5 text-emerald-400" />
              <span>Body Fat</span>
            </div>
            <div className="text-lg font-black text-white">
              {record.body_fat_percentage !== undefined && record.body_fat_percentage !== null
                ? `${Number(record.body_fat_percentage).toFixed(1)}%`
                : '—'}
            </div>
          </div>
        </div>

        {/* Circumference Badges */}
        {(record.chest_cm || record.waist_cm || record.hip_cm || record.arm_cm || record.thigh_cm) && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {record.waist_cm && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[11px]">
                Waist: <strong className="ml-1 text-white">{Number(record.waist_cm).toFixed(1)}cm</strong>
              </span>
            )}
            {record.chest_cm && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[11px]">
                Chest: <strong className="ml-1 text-white">{Number(record.chest_cm).toFixed(1)}cm</strong>
              </span>
            )}
            {record.hip_cm && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[11px]">
                Hip: <strong className="ml-1 text-white">{Number(record.hip_cm).toFixed(1)}cm</strong>
              </span>
            )}
            {record.arm_cm && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[11px]">
                Arm: <strong className="ml-1 text-white">{Number(record.arm_cm).toFixed(1)}cm</strong>
              </span>
            )}
            {record.thigh_cm && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[11px]">
                Thigh: <strong className="ml-1 text-white">{Number(record.thigh_cm).toFixed(1)}cm</strong>
              </span>
            )}
          </div>
        )}

        {/* Notes */}
        {record.notes && (
          <div className="rounded-xl bg-slate-950/40 p-3 border border-slate-800/40 text-xs text-slate-300 mb-3 flex items-start gap-2">
            <FileText className="h-3.5 w-3.5 text-slate-500 shrink-0 mt-0.5" />
            <p className="line-clamp-3 leading-relaxed">{record.notes}</p>
          </div>
        )}
      </div>

      {/* Footer: Linked Entities */}
      {(record.training_plan || record.training_session) && (
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap gap-2 text-xs">
          {record.training_plan && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px] font-semibold">
              <Dumbbell className="h-3 w-3" />
              {record.training_plan.name}
            </span>
          )}
          {record.training_session && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-violet-500/10 text-violet-400 border border-violet-500/20 text-[11px] font-semibold">
              <Clock className="h-3 w-3" />
              {record.training_session.session_type}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
export default ProgressRecordCard
