import React from 'react'
import {
  Dumbbell,
  Play,
  Film,
  Building2,
  Globe2,
  Edit2,
  Trash2,
  PlusCircle,
  Info,
} from 'lucide-react'
import type { Exercise } from '../../types/exercise'
import type { User } from '../../types/auth'

interface ExerciseCardProps {
  exercise: Exercise
  currentUser: User | null
  onViewDetails: (exercise: Exercise) => void
  onEdit?: (exercise: Exercise) => void
  onDelete?: (exercise: Exercise) => void
  onAddVideo?: (exercise: Exercise) => void
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  currentUser,
  onViewDetails,
  onEdit,
  onDelete,
  onAddVideo,
}) => {
  const isPlatform = exercise.tenant_id === null || exercise.tenant_id === undefined

  // Check if current user can edit this exercise
  const canModify = Boolean(
    currentUser &&
      (currentUser.role === 'super_admin' ||
        ((currentUser.role === 'gym_admin' || currentUser.role === 'coach') &&
          !isPlatform &&
          currentUser.tenant_id === exercise.tenant_id))
  )

  const difficultyColors: Record<string, string> = {
    beginner: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    intermediate: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    advanced: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  }

  const typeColors: Record<string, string> = {
    strength: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    cardio: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    mobility: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    stretching: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    core: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  }

  const formatDuration = (seconds?: number | null) => {
    if (!seconds || seconds <= 0) return null
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs > 0 ? `${secs}s` : ''}`
  }

  return (
    <div className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/5 hover:-translate-y-1 ${
      exercise.is_active ? 'border-slate-800 bg-slate-900/90' : 'border-slate-800/60 bg-slate-950/60 opacity-75'
    }`}>
      {/* Top Banner / Video Thumbnail */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-slate-800 via-slate-850 to-slate-900">
        {exercise.primary_video?.thumbnail_url ? (
          <img
            src={exercise.primary_video.thumbnail_url}
            alt={exercise.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center p-6 text-slate-600">
            <Dumbbell className="h-12 w-12 stroke-[1.25] text-slate-700 transition-colors group-hover:text-emerald-500/40" />
            <span className="mt-2 text-xs font-medium text-slate-500">{exercise.muscle_group}</span>
          </div>
        )}

        {/* Video Play Overlay */}
        {exercise.videos_count > 0 && (
          <button
            onClick={() => onViewDetails(exercise)}
            className="absolute inset-0 flex items-center justify-center bg-slate-950/30 backdrop-blur-[2px] opacity-0 transition-opacity duration-300 group-hover:opacity-100 cursor-pointer"
            aria-label="Play exercise technique video"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30 transition-transform duration-300 hover:scale-110">
              <Play className="h-5 w-5 fill-current ml-0.5" />
            </div>
          </button>
        )}

        {/* Scope Badge (Platform vs Gym Custom) */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          {isPlatform ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-950/80 px-2.5 py-1 text-[11px] font-semibold text-sky-400 backdrop-blur-md shadow-sm">
              <Globe2 className="h-3 w-3" /> Platform Standard
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-950/80 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 backdrop-blur-md shadow-sm">
              <Building2 className="h-3 w-3" /> Gym Custom
            </span>
          )}

          {!exercise.is_active && (
            <span className="rounded-full border border-amber-500/30 bg-amber-950/80 px-2 py-0.5 text-[10px] font-semibold text-amber-400 backdrop-blur-md">
              Archived
            </span>
          )}
        </div>

        {/* Videos Count Badge */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
          {exercise.videos_count > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-0.5 text-[11px] font-medium text-slate-300 backdrop-blur-md">
              <Film className="h-3 w-3 text-emerald-400" />
              {exercise.videos_count} {exercise.videos_count === 1 ? 'Video' : 'Videos'}
              {exercise.primary_video?.duration_seconds && (
                <span className="text-slate-400 font-mono">
                  • {formatDuration(exercise.primary_video.duration_seconds)}
                </span>
              )}
            </span>
          ) : (
            <span className="rounded-full border border-slate-800 bg-slate-900/80 px-2 py-0.5 text-[10px] font-medium text-slate-500 backdrop-blur-md">
              No Video
            </span>
          )}
        </div>
      </div>

      {/* Exercise Content Body */}
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3">
          <h3 className="text-base font-bold text-white transition-colors group-hover:text-emerald-400 line-clamp-1">
            {exercise.name}
          </h3>
          {exercise.description ? (
            <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
              {exercise.description}
            </p>
          ) : (
            <p className="mt-1 text-xs italic text-slate-600">No description provided</p>
          )}
        </div>

        {/* Badges / Taxonomy */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          <span className="rounded-md border border-slate-800 bg-slate-800/60 px-2 py-0.5 text-[11px] font-medium text-slate-300">
            {exercise.muscle_group}
          </span>
          {exercise.secondary_muscle_group && (
            <span className="rounded-md border border-slate-800/50 bg-slate-800/30 px-2 py-0.5 text-[11px] text-slate-400">
              +{exercise.secondary_muscle_group}
            </span>
          )}
          <span className="rounded-md border border-slate-800 bg-slate-800/60 px-2 py-0.5 text-[11px] font-medium text-slate-400">
            {exercise.equipment}
          </span>
          <span
            className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold capitalize ${
              difficultyColors[exercise.difficulty] || 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {exercise.difficulty}
          </span>
          <span
            className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold capitalize ${
              typeColors[exercise.exercise_type] || 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {exercise.exercise_type}
          </span>
        </div>

        {/* Action Controls */}
        <div className="mt-auto flex items-center justify-between border-t border-slate-800/80 pt-3.5">
          <button
            onClick={() => onViewDetails(exercise)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 transition hover:text-emerald-300 cursor-pointer"
          >
            <Info className="h-3.5 w-3.5" /> View Technique
          </button>

          {canModify && (
            <div className="flex items-center gap-1">
              {onAddVideo && (
                <button
                  onClick={() => onAddVideo(exercise)}
                  title="Add technique video"
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-emerald-400 cursor-pointer"
                >
                  <PlusCircle className="h-4 w-4" />
                </button>
              )}
              {onEdit && (
                <button
                  onClick={() => onEdit(exercise)}
                  title="Edit exercise"
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-sky-400 cursor-pointer"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              )}
              {onDelete && exercise.is_active && (
                <button
                  onClick={() => onDelete(exercise)}
                  title="Archive or delete exercise"
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-rose-400 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
