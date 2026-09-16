import React, { useState, useEffect } from 'react'
import {
  X,
  Dumbbell,
  Globe2,
  Building2,
  Film,
  PlusCircle,
  Trash2,
  Loader2,
  AlertCircle,
  BookOpen,
} from 'lucide-react'
import { ExerciseVideoPlayer } from './ExerciseVideoPlayer'
import type { Exercise, ExerciseVideo } from '../../types/exercise'
import type { User } from '../../types/auth'
import { exerciseApi } from '../../services/exerciseApi'

interface ExerciseDetailsModalProps {
  isOpen?: boolean
  exerciseId: string
  currentUser?: User | null
  token: string | null
  onClose: () => void
  onAddVideo?: (exercise: Exercise) => void
  onExerciseUpdated?: () => void
}

export const ExerciseDetailsModal: React.FC<ExerciseDetailsModalProps> = ({
  isOpen = true,
  exerciseId,
  currentUser = null,
  token,
  onClose,
  onAddVideo,
  onExerciseUpdated,
}) => {
  if (!isOpen) return null

  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<ExerciseVideo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const loadExercise = async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const data = await exerciseApi.getExercise(exerciseId, token)
      setExercise(data)
      // Pick primary video or first active video
      const activeVideos = data.videos?.filter((v) => v.is_active) || []
      const primary = activeVideos.find((v) => v.is_primary) || activeVideos[0] || null
      setSelectedVideo(primary)
    } catch (err: any) {
      setError(err.message || 'Failed to load exercise details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadExercise()
  }, [exerciseId, token])

  const isPlatform = exercise?.tenant_id === null || exercise?.tenant_id === undefined
  const canModify = Boolean(
    currentUser &&
      (currentUser.role === 'super_admin' ||
        ((currentUser.role === 'gym_admin' || currentUser.role === 'coach') &&
          !isPlatform &&
          currentUser.tenant_id === exercise?.tenant_id))
  )

  const handleSetPrimaryVideo = async (video: ExerciseVideo) => {
    if (!token || !exercise || actionLoading) return
    setActionLoading(true)
    try {
      await exerciseApi.updateVideo(exercise.id, video.id, { is_primary: true }, token)
      await loadExercise()
      if (onExerciseUpdated) onExerciseUpdated()
    } catch (err: any) {
      alert(err.message || 'Failed to set primary video')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteVideo = async (video: ExerciseVideo) => {
    if (!token || !exercise || actionLoading) return
    if (!window.confirm(`Are you sure you want to remove the video "${video.title}"?`)) return
    setActionLoading(true)
    try {
      await exerciseApi.deleteVideo(exercise.id, video.id, token)
      await loadExercise()
      if (onExerciseUpdated) onExerciseUpdated()
    } catch (err: any) {
      alert(err.message || 'Failed to remove video')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md overflow-y-auto">
      <div className="relative my-8 w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Exercise & Technique Guide</h3>
              <p className="text-xs text-slate-400">Instructional video and performance cues</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="max-h-[80vh] overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              <p className="text-sm">Loading technique tutorial...</p>
            </div>
          ) : error || !exercise ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
              <AlertCircle className="h-8 w-8 text-rose-500" />
              <p className="text-sm text-slate-300">{error || 'Exercise not found'}</p>
              <button
                onClick={onClose}
                className="mt-2 rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
              >
                Close Window
              </button>
            </div>
          ) : (
            <>
              {/* Exercise Title & Tags */}
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {isPlatform ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-950/80 px-2.5 py-0.5 text-xs font-semibold text-sky-400">
                      <Globe2 className="h-3.5 w-3.5" /> Platform Movement
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-950/80 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                      <Building2 className="h-3.5 w-3.5" /> Gym Custom Movement
                    </span>
                  )}
                  <span className="rounded-md border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-300">
                    {exercise.muscle_group}
                  </span>
                  {exercise.secondary_muscle_group && (
                    <span className="rounded-md border border-slate-700 bg-slate-800/60 px-2 py-0.5 text-xs text-slate-400">
                      +{exercise.secondary_muscle_group}
                    </span>
                  )}
                  <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-300">
                    {exercise.equipment}
                  </span>
                  <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs font-semibold text-emerald-400 capitalize">
                    {exercise.difficulty}
                  </span>
                  <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs font-semibold text-blue-400 capitalize">
                    {exercise.exercise_type}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">{exercise.name}</h2>
                {exercise.description && (
                  <p className="mt-1.5 text-sm text-slate-300 leading-relaxed">{exercise.description}</p>
                )}
              </div>

              {/* Video Player Display */}
              {selectedVideo ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Film className="h-3.5 w-3.5 text-emerald-400" /> Video Demonstration
                    </span>
                    {canModify && selectedVideo && (
                      <div className="flex items-center gap-2">
                        {!selectedVideo.is_primary && (
                          <button
                            onClick={() => handleSetPrimaryVideo(selectedVideo)}
                            disabled={actionLoading}
                            className="text-xs font-medium text-emerald-400 hover:underline cursor-pointer"
                          >
                            Set as Primary Technique
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteVideo(selectedVideo)}
                          disabled={actionLoading}
                          className="text-xs font-medium text-rose-400 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" /> Remove Video
                        </button>
                      </div>
                    )}
                  </div>

                  <ExerciseVideoPlayer video={selectedVideo} autoPlay={false} />
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-8 text-center">
                  <Film className="mx-auto h-10 w-10 text-slate-600 mb-2" />
                  <p className="text-sm font-medium text-slate-400">No tutorial videos available yet</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Coaches and gym admins can attach video guides to demonstrate technique.
                  </p>
                  {canModify && onAddVideo && (
                    <button
                      onClick={() => onAddVideo(exercise)}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow hover:bg-emerald-500 cursor-pointer"
                    >
                      <PlusCircle className="h-3.5 w-3.5" /> Attach Video
                    </button>
                  )}
                </div>
              )}

              {/* Video Gallery Carousel / List if multiple videos */}
              {exercise.videos && exercise.videos.length > 1 && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Alternative Technique Angles ({exercise.videos.length})
                    </h4>
                    {canModify && onAddVideo && (
                      <button
                        onClick={() => onAddVideo(exercise)}
                        className="text-xs font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                      >
                        <PlusCircle className="h-3.5 w-3.5" /> Add Video
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {exercise.videos.map((vid) => (
                      <button
                        key={vid.id}
                        onClick={() => setSelectedVideo(vid)}
                        className={`group relative overflow-hidden rounded-xl border p-2 text-left transition ${
                          selectedVideo?.id === vid.id
                            ? 'border-emerald-500 bg-emerald-950/20'
                            : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                        }`}
                      >
                        <div className="relative aspect-video w-full rounded-lg bg-slate-900 overflow-hidden mb-1.5">
                          {vid.thumbnail_url ? (
                            <img
                              src={vid.thumbnail_url}
                              alt={vid.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-600">
                              <Film className="h-6 w-6" />
                            </div>
                          )}
                          {vid.is_primary && (
                            <span className="absolute top-1 left-1 rounded bg-emerald-500 px-1 py-0.5 text-[9px] font-bold text-slate-950">
                              Primary
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-medium text-white line-clamp-1 group-hover:text-emerald-400">
                          {vid.title}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step-by-Step Performance Instructions */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-5">
                <h4 className="mb-2.5 flex items-center gap-2 text-sm font-bold text-white">
                  <BookOpen className="h-4 w-4 text-emerald-400" /> Performance Instructions & Cues
                </h4>
                {exercise.instructions ? (
                  <div className="whitespace-pre-line text-xs text-slate-300 leading-relaxed font-sans">
                    {exercise.instructions}
                  </div>
                ) : (
                  <p className="text-xs italic text-slate-500">
                    No specific step-by-step instructions recorded for this movement.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end border-t border-slate-800 bg-slate-900 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
