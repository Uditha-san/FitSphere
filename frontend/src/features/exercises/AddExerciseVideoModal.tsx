import React, { useState } from 'react'
import { X, Film, Loader2, AlertCircle, PlusCircle, Sparkles } from 'lucide-react'
import type { Exercise, ExerciseVideoCreatePayload } from '../../types/exercise'
import { exerciseApi } from '../../services/exerciseApi'

interface AddExerciseVideoModalProps {
  exercise: Exercise
  token: string
  onClose: () => void
  onVideoAdded: () => void
}

export const AddExerciseVideoModal: React.FC<AddExerciseVideoModalProps> = ({
  exercise,
  token,
  onClose,
  onVideoAdded,
}) => {
  const [title, setTitle] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [description, setDescription] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [durationSeconds, setDurationSeconds] = useState<number | ''>('')
  const [isPrimary, setIsPrimary] = useState(exercise.videos_count === 0)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Video title is required.')
      return
    }
    if (!videoUrl.trim()) {
      setError('Video URL is required.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const payload: ExerciseVideoCreatePayload = {
        title: title.trim(),
        video_url: videoUrl.trim(),
        description: description.trim() || undefined,
        thumbnail_url: thumbnailUrl.trim() || undefined,
        duration_seconds: durationSeconds ? Number(durationSeconds) : undefined,
        is_primary: isPrimary,
      }

      await exerciseApi.addVideo(exercise.id, payload, token)
      onVideoAdded()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to attach video to exercise.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md overflow-y-auto">
      <div className="relative my-8 w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Film className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Attach Tutorial Video</h3>
              <p className="text-xs text-slate-400">For {exercise.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-300">
              Video Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Side Angle Breakdown & Foot Position"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-300">
              Video URL <span className="text-rose-400">*</span>
            </label>
            <input
              type="url"
              required
              placeholder="https://www.youtube.com/watch?v=... or Vimeo"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                Thumbnail URL (Opt.)
              </label>
              <input
                type="url"
                placeholder="https://img.youtube.com/..."
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                Duration Seconds (Opt.)
              </label>
              <input
                type="number"
                placeholder="e.g. 195"
                min={0}
                value={durationSeconds}
                onChange={(e) =>
                  setDurationSeconds(e.target.value ? Number(e.target.value) : '')
                }
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-300">
              Description / Coaching Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Highlight specific form cues demonstrated in this video..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Primary Video Toggle */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isPrimaryToggle"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0"
            />
            <label
              htmlFor="isPrimaryToggle"
              className="text-xs font-medium text-slate-300 cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" /> Make this the Primary Technique Video
            </label>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-500 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Uploading Video...
                </>
              ) : (
                <>
                  <PlusCircle className="h-4 w-4" /> Attach Video
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
