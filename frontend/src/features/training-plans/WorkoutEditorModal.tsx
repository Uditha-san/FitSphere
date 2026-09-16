import React, { useState, useEffect } from 'react'
import { X, Dumbbell, Calendar, Loader2, AlertCircle, Sparkles } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { trainingPlanApiService } from '../../services/trainingPlanApi'
import { exerciseApi } from '../../services/exerciseApi'
import type { WorkoutDay, WorkoutExercise } from '../../types/trainingPlan'
import type { Exercise } from '../../types/exercise'

interface AddDayModalProps {
  isOpen: boolean
  planId: string
  onClose: () => void
  onSuccess: (day: WorkoutDay) => void
}

export const AddDayModal: React.FC<AddDayModalProps> = ({
  isOpen,
  planId,
  onClose,
  onSuccess,
}) => {
  const { token } = useAuth()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [dayNumber, setDayNumber] = useState<number>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    if (!name.trim()) {
      setError('Please provide a day name')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const newDay = await trainingPlanApiService.addWorkoutDay(
        planId,
        {
          name: name.trim(),
          description: description.trim() || undefined,
          day_number: dayNumber || undefined,
        },
        token
      )
      onSuccess(newDay)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to add workout day')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Calendar className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold text-white">Add Workout Day</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Day Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Day 1: Upper Body Strength"
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Day Number</label>
              <input
                type="number"
                min={1}
                max={31}
                value={dayNumber}
                onChange={(e) => setDayNumber(parseInt(e.target.value) || 1)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Focus / Warm-Up Notes</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 5 min light rowing, dynamic shoulder mobility"
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Add Workout Day'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface AddExerciseModalProps {
  isOpen: boolean
  dayId: string
  onClose: () => void
  onSuccess: (exercise: WorkoutExercise) => void
}

export const AddExerciseModal: React.FC<AddExerciseModalProps> = ({
  isOpen,
  dayId,
  onClose,
  onSuccess,
}) => {
  const { token } = useAuth()
  const [libraryExercises, setLibraryExercises] = useState<Exercise[]>([])
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('')
  const [exerciseName, setExerciseName] = useState('')
  const [sets, setSets] = useState<number>(3)
  const [repetitions, setRepetitions] = useState('10')
  const [restSeconds, setRestSeconds] = useState<number>(60)
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && token) {
      exerciseApi
        .listExercises({ is_active: true, limit: 150 }, token)
        .then((data) => setLibraryExercises(data))
        .catch(() => {})
    }
  }, [isOpen, token])

  if (!isOpen) return null

  const handleLibrarySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const exId = e.target.value
    setSelectedExerciseId(exId)
    if (!exId) return

    const match = libraryExercises.find((x) => x.id === exId)
    if (match) {
      setExerciseName(match.name)
      if (!notes && match.description) {
        setNotes(match.description)
      }
    }
  }

  const selectedLibExercise = libraryExercises.find((x) => x.id === selectedExerciseId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    if (!exerciseName.trim()) {
      setError('Please provide an exercise name')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const newExercise = await trainingPlanApiService.addExercise(
        dayId,
        {
          exercise_name: exerciseName.trim(),
          exercise_id: selectedExerciseId || undefined,
          sets: Number(sets) || 3,
          repetitions: repetitions.trim() || '10',
          rest_seconds: Number(restSeconds) || 60,
          notes: notes.trim() || undefined,
        },
        token
      )
      onSuccess(newExercise)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to add exercise')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Dumbbell className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold text-white">Add Exercise</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Choose from Library Dropdown */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Choose from Library</span>
              <span className="text-[10px] text-emerald-400 font-normal">Auto-links video tutorial</span>
            </label>
            <select
              value={selectedExerciseId}
              onChange={handleLibrarySelect}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- Custom Exercise (Not in Library) --</option>
              {libraryExercises.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name} ({ex.muscle_group}) {ex.videos_count > 0 ? '🎬' : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedLibExercise && (
            <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[11px] text-emerald-400">
              <Sparkles className="h-3 w-3" />
              <span>Linked to Exercise Library {selectedLibExercise.videos_count > 0 ? '• Video Tutorial Available' : ''}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Exercise Name *</label>
            <input
              type="text"
              required
              value={exerciseName}
              onChange={(e) => {
                setExerciseName(e.target.value)
                if (selectedExerciseId && selectedLibExercise && e.target.value !== selectedLibExercise.name) {
                  setSelectedExerciseId('')
                }
              }}
              placeholder="e.g. Barbell Bench Press"
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Sets</label>
              <input
                type="number"
                min={1}
                max={20}
                value={sets}
                onChange={(e) => setSets(parseInt(e.target.value) || 1)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Reps</label>
              <input
                type="text"
                value={repetitions}
                onChange={(e) => setRepetitions(e.target.value)}
                placeholder="e.g. 8-12"
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Rest (sec)</label>
              <input
                type="number"
                min={0}
                max={600}
                value={restSeconds}
                onChange={(e) => setRestSeconds(parseInt(e.target.value) || 0)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Coaching Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Pause 1s at chest, explosive concentric"
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Add Exercise'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
