import React, { useState } from 'react'
import { X, Dumbbell, Loader2, AlertCircle, Save } from 'lucide-react'
import type { Difficulty, ExerciseType, Exercise, ExerciseUpdatePayload } from '../../types/exercise'
import { exerciseApi } from '../../services/exerciseApi'

interface EditExerciseModalProps {
  exercise: Exercise
  token: string
  onClose: () => void
  onUpdated: () => void
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

export const EditExerciseModal: React.FC<EditExerciseModalProps> = ({
  exercise,
  token,
  onClose,
  onUpdated,
}) => {
  const [name, setName] = useState(exercise.name)
  const [muscleGroup, setMuscleGroup] = useState(exercise.muscle_group)
  const [secondaryMuscleGroup, setSecondaryMuscleGroup] = useState(
    exercise.secondary_muscle_group || ''
  )
  const [equipment, setEquipment] = useState(exercise.equipment)
  const [difficulty, setDifficulty] = useState<Difficulty>(exercise.difficulty)
  const [exerciseType, setExerciseType] = useState<ExerciseType>(exercise.exercise_type)
  const [description, setDescription] = useState(exercise.description || '')
  const [instructions, setInstructions] = useState(exercise.instructions || '')
  const [isActive, setIsActive] = useState(exercise.is_active)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Exercise name is required.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const payload: ExerciseUpdatePayload = {
        name: name.trim(),
        muscle_group: muscleGroup,
        secondary_muscle_group: secondaryMuscleGroup.trim() || undefined,
        equipment: equipment,
        difficulty,
        exercise_type: exerciseType,
        description: description.trim() || undefined,
        instructions: instructions.trim() || undefined,
        is_active: isActive,
      }

      await exerciseApi.updateExercise(exercise.id, payload, token)
      onUpdated()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to update exercise.')
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
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Edit Exercise Details</h3>
              <p className="text-xs text-slate-400">Update movement taxonomy, cues, or active state</p>
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
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-sky-500 focus:outline-none"
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
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
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
                Secondary Muscle
              </label>
              <input
                type="text"
                placeholder="e.g. Triceps"
                value={secondaryMuscleGroup}
                onChange={(e) => setSecondaryMuscleGroup(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                Equipment <span className="text-rose-400">*</span>
              </label>
              <select
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
              >
                {EQUIPMENT_LIST.map((eq) => (
                  <option key={eq} value={eq}>
                    {eq}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Difficulty & Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-sky-500 focus:outline-none capitalize"
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
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-sky-500 focus:outline-none capitalize"
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
            <label className="mb-1 block text-xs font-semibold text-slate-300">Overview</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
            />
          </div>

          {/* Instructions */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-300">
              Performance Instructions & Cues
            </label>
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-sky-500 focus:outline-none font-mono"
            />
          </div>

          {/* Active Status Toggle */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActiveToggle"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-0"
            />
            <label htmlFor="isActiveToggle" className="text-xs font-medium text-slate-300 cursor-pointer">
              Active in Library (Uncheck to archive and hide from active exercise picker)
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
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-500 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving Changes...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
