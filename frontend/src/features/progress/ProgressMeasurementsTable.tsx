import React from 'react'
import {
  Calendar,
  Dumbbell,
  Clock,
  Edit2,
  Trash2,
  User as UserIcon,
} from 'lucide-react'
import type { ProgressRecord } from '../../types/progress'

interface ProgressMeasurementsTableProps {
  records: ProgressRecord[]
  showClientColumn?: boolean
  showCoachColumn?: boolean
  canManage?: boolean
  onEdit?: (record: ProgressRecord) => void
  onDelete?: (record: ProgressRecord) => void
}

export const ProgressMeasurementsTable: React.FC<ProgressMeasurementsTableProps> = ({
  records,
  showClientColumn = false,
  showCoachColumn = false,
  canManage = false,
  onEdit,
  onDelete,
}) => {
  if (records.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center text-slate-400">
        <Calendar className="h-8 w-8 text-slate-600 mx-auto mb-2" />
        <p className="text-sm font-medium">No progress records to display.</p>
        <p className="text-xs text-slate-500 mt-1">Logged check-ins and body metrics will appear here.</p>
      </div>
    )
  }

  const formatMetric = (val?: number | null, unit: string = '') => {
    if (val === null || val === undefined) return <span className="text-slate-600">—</span>
    return (
      <span className="font-semibold text-slate-200">
        {Number(val).toFixed(1)} <span className="text-[11px] font-normal text-slate-400">{unit}</span>
      </span>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-sm shadow-xl">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold tracking-wider uppercase text-[11px]">
            <th className="py-3.5 px-4">Date</th>
            {showClientColumn && <th className="py-3.5 px-4">Client</th>}
            {showCoachColumn && <th className="py-3.5 px-4">Coach</th>}
            <th className="py-3.5 px-4">Weight</th>
            <th className="py-3.5 px-4">Body Fat</th>
            <th className="py-3.5 px-4">Waist</th>
            <th className="py-3.5 px-4">Chest</th>
            <th className="py-3.5 px-4">Hip</th>
            <th className="py-3.5 px-4">Arm</th>
            <th className="py-3.5 px-4">Thigh</th>
            <th className="py-3.5 px-4">Linked To</th>
            <th className="py-3.5 px-4">Notes</th>
            {canManage && <th className="py-3.5 px-4 text-right">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {records.map((record) => {
            const date = new Date(record.recorded_at)
            const dateStr = date.toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
            const timeStr = date.toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            })

            return (
              <tr
                key={record.id}
                className="hover:bg-slate-800/40 transition-colors group"
              >
                {/* Date */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <div className="font-bold text-white text-xs">{dateStr}</div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3" />
                    <span>{timeStr}</span>
                  </div>
                </td>

                {/* Client */}
                {showClientColumn && (
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 font-medium text-slate-200">
                      <UserIcon className="h-3.5 w-3.5 text-indigo-400" />
                      <span>{record.client?.full_name || record.client?.email || 'Client'}</span>
                    </div>
                  </td>
                )}

                {/* Coach */}
                {showCoachColumn && (
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 font-medium text-slate-300">
                      <UserIcon className="h-3.5 w-3.5 text-blue-400" />
                      <span>{record.coach?.full_name || record.coach?.email || 'Coach'}</span>
                    </div>
                  </td>
                )}

                {/* Metrics */}
                <td className="py-3.5 px-4 whitespace-nowrap">{formatMetric(record.weight_kg, 'kg')}</td>
                <td className="py-3.5 px-4 whitespace-nowrap">{formatMetric(record.body_fat_percentage, '%')}</td>
                <td className="py-3.5 px-4 whitespace-nowrap">{formatMetric(record.waist_cm, 'cm')}</td>
                <td className="py-3.5 px-4 whitespace-nowrap">{formatMetric(record.chest_cm, 'cm')}</td>
                <td className="py-3.5 px-4 whitespace-nowrap">{formatMetric(record.hip_cm, 'cm')}</td>
                <td className="py-3.5 px-4 whitespace-nowrap">{formatMetric(record.arm_cm, 'cm')}</td>
                <td className="py-3.5 px-4 whitespace-nowrap">{formatMetric(record.thigh_cm, 'cm')}</td>

                {/* Linked Plan / Session */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <div className="flex flex-col gap-1">
                    {record.training_plan && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-semibold w-fit">
                        <Dumbbell className="h-2.5 w-2.5" />
                        {record.training_plan.name}
                      </span>
                    )}
                    {record.training_session && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-400 border border-violet-500/20 text-[10px] font-semibold w-fit">
                        <Clock className="h-2.5 w-2.5" />
                        {record.training_session.session_type}
                      </span>
                    )}
                    {!record.training_plan && !record.training_session && (
                      <span className="text-slate-600">—</span>
                    )}
                  </div>
                </td>

                {/* Notes */}
                <td className="py-3.5 px-4 max-w-xs">
                  {record.notes ? (
                    <div className="text-slate-300 text-xs line-clamp-2" title={record.notes}>
                      {record.notes}
                    </div>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>

                {/* Actions */}
                {canManage && (
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
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
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
export default ProgressMeasurementsTable
