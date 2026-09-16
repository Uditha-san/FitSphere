import React, { useState } from 'react'
import { X, Dumbbell, Film, Loader2, AlertCircle, PlusCircle } from 'lucide-react'
import type { Difficulty, ExerciseType, ExerciseCreatePayload } from '../../types/exercise'
import type { User } from '../../types/auth'
import { exerciseApi } from '../../services/exerciseApi'

interface CreateExerciseModalProps {
  currentUser: User
  token: string
  onClose: () => void
  onCreated: () => void
}

const MUSCLE_GROUPS = [
  'Chest',
  'Back',
  'Quads',
  'Hamstrings',
  'Shoulders',
  'Arms',
  'Glutes',
  'Core',
  'Full Body',
]

const EQUIPMENT_LIST = [
  'Barbell',
  'Dumbbell',
  'Cable',
  'Machine',
  'Bodyweight',
  'Specialty Bar',
  'Kettlebell',
  'Resistance Band',
]

export const CreateExerciseModal: React.FC<CreateExerciseModalProps> = ({
  currentUser,
  token,
  onClose,
  onCreated,
}) => {
  const [name, setName] = useState('')
  const [muscleGroup, setMuscleGroup] = useState('Chest')
  const [secondaryMuscleGroup, setSecondaryMuscleGroup] = useState('')
  const [equipment, setEquipment] = useState('Barbell')
  const [difficulty, setDifficulty] = useState<Difficulty>('intermediate')
  const [exerciseType, setExerciseType] = useState<ExerciseType>('strength')
  const [description, setDescription] = useState('')
  const [instructions, setInstructions] = useState('')

  // Optional initial video
  const [includeVideo, setIncludeVideo] = useState(false)
  const [videoTitle, setVideoTitle] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [durationSeconds, setDurationSeconds] = useState<number | ''>('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Exercise name is required.')
      return
    }

    if (includeVideo && !videoUrl.trim()) {
      setError('Video URL is required if tutorial video is enabled.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const payload: ExerciseCreatePayload = {
        name: name.trim(),
        muscle_group: muscleGroup,
        secondary_muscle_group: secondaryMuscleGroup.trim() || undefined,
        equipment: equipment,
        difficulty,
        exercise_type: exerciseType,
        description: description.trim() || undefined,
        instructions: instructions.trim() || undefined,
        tenant_id: currentUser.role === 'super_admin' ? null : currentUser.tenant_id,
        videos:
          includeVideo && videoUrl.trim()
            ? [
                {
                  title: videoTitle.trim() || `${name.trim()} Technique Tutorial`,
                  video_url: videoUrl.trim(),
                  thumbnail_url: thumbnailUrl.trim() || undefined,
                  duration_seconds: durationSeconds ? Number(durationSeconds) : undefined,
                  is_primary: true,
                },
              ]
            : undefined,
      }

      await exerciseApi.createExercise(payload, token)
      onCreated()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to create exercise.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md overflow-y-auto">
      <div className="relative my-8 w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Create Library Movement</h3>
              <p className="text-xs text-slate-400">
                {currentUser.role === 'super_admin'
                  ? 'Add standard platform-wide movement'
                  : 'Add custom movement for your gym'}
              </p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-300">
              Exercise Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Incline Dumbbell Bench Press"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Muscle Groups & Equipment */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                Primary Muscle <span className="text-rose-400">*</span>
              </label>
              <select
                value={muscleGroup}
                onChange={(e) => setMuscleGroup(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
              >
                {MUSCLE_GROUPS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                Secondary Muscle (Opt.)
              </label>
              <input
                type="text"
                placeholder="e.g. Triceps"
                value={secondaryMuscleGroup}
                onChange={(e) => setSecondaryMuscleGroup(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                Equipment <span className="text-rose-400">*</span>
              </label>
              <select
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
              >
                {EQUIPMENT_LIST.map((eq) => (
                  <option key={eq} value={eq}>
                    {eq}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Difficulty & Exercise Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none capitalize"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">Exercise Type</label>
              <select
                value={exerciseType}
                onChange={(e) => setExerciseType(e.target.value as ExerciseType)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none capitalize"
              >
                <option value="strength">Strength</option>
                <option value="cardio">Cardio</option>
                <option value="mobility">Mobility</option>
                <option value="stretching">Stretching</option>
                <option value="core">Core</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-300">
              Overview / Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Short summary of the exercise and primary benefits..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Step-by-step Instructions */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-300">
              Performance Instructions & Cues (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="1. Set up posture...&#10;2. Descend with control...&#10;3. Drive up to full extension."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none font-mono"
            />
          </div>

          {/* Video Attachment Accordion */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeVideo}
                onChange={(e) => setIncludeVideo(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0"
              />
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Film className="h-4 w-4 text-emerald-400" /> Attach Tutorial Video
              </span>
            </label>

            {includeVideo && (
              <div className="mt-3 space-y-3 pt-3 border-t border-slate-800/80">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-400">
                    Video Title (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Proper Bar Path & Setup"
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-400">
                    Web Video URL <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=... or Vimeo"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-slate-400">
                      Thumbnail URL (Opt.)
                    </label>
                    <input
                      type="url"
                      placeholder="https://img.youtube.com/..."
                      value={thumbnailUrl}
                      onChange={(e) => setThumbnailUrl(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-slate-400">
                      Duration Seconds (Opt.)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 180"
                      min={0}
                      value={durationSeconds}
                      onChange={(e) =>
                        setDurationSeconds(e.target.value ? Number(e.target.value) : '')
                      }
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
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
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <PlusCircle className="h-4 w-4" /> Save to Library
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
