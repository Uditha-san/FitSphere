import React from 'react'
import {
  Dumbbell,
  Plus,
  Trash2,
  Clock,
  Repeat,
  Layers,
  FileText,
} from 'lucide-react'
import type { WorkoutDay, WorkoutExercise } from '../../types/trainingPlan'

interface WorkoutCardProps {
  day: WorkoutDay
  canEdit?: boolean
  onAddExercise?: (dayId: string) => void
  onDeleteDay?: (dayId: string) => void
  onDeleteExercise?: (exerciseId: string) => void
}

export const WorkoutCard: React.FC<WorkoutCardProps> = ({
  day,
  canEdit = false,
  onAddExercise,
  onDeleteDay,
  onDeleteExercise,
}) => {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg space-y-4">
      {/* Day Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm">
            {day.day_number ? `D${day.day_number}` : <Dumbbell className="h-4 w-4" />}
          </div>
          <div>
            <h4 className="text-base font-bold text-white tracking-tight">{day.name}</h4>
            {day.description && (
              <p className="text-xs text-slate-400">{day.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && onAddExercise && (
            <button
              onClick={() => onAddExercise(day.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Exercise
            </button>
          )}

          {canEdit && onDeleteDay && (
            <button
              onClick={() => onDeleteDay(day.id)}
              title="Delete Workout Day"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Exercises List */}
      {day.exercises.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-xs text-slate-500">
          No exercises scheduled for this day yet.
          {canEdit && ' Click "Add Exercise" above to add movements.'}
        </div>
      ) : (
        <div className="space-y-2.5">
          {day.exercises.map((exercise: WorkoutExercise, index: number) => (
            <div
              key={exercise.id}
              className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:border-slate-700 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500 w-5">
                    #{index + 1}
                  </span>
                  <span className="text-sm font-semibold text-white tracking-tight">
                    {exercise.exercise_name}
                  </span>
                </div>
                {exercise.notes && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 pl-7">
                    <FileText className="h-3 w-3 text-slate-500 shrink-0" />
                    <span>{exercise.notes}</span>
                  </div>
                )}
              </div>

              {/* Stats badges */}
              <div className="flex items-center gap-2 pl-7 sm:pl-0">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/50 text-[11px] font-medium text-slate-300">
                  <Layers className="h-3 w-3 text-indigo-400" />
                  <span>{exercise.sets} sets</span>
                </div>

                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/50 text-[11px] font-medium text-slate-300">
                  <Repeat className="h-3 w-3 text-emerald-400" />
                  <span>{exercise.repetitions} reps</span>
                </div>

                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/50 text-[11px] font-medium text-slate-300">
                  <Clock className="h-3 w-3 text-amber-400" />
                  <span>{exercise.rest_seconds}s rest</span>
                </div>

                {canEdit && onDeleteExercise && (
                  <button
                    onClick={() => onDeleteExercise(exercise.id)}
                    title="Remove Exercise"
                    className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors opacity-80 hover:opacity-100 cursor-pointer ml-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default WorkoutCard
