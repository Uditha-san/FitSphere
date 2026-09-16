import React, { useState, useEffect, useMemo } from 'react'
import {
  Dumbbell,
  Plus,
  RefreshCw,
  AlertCircle,
  Loader2,
  Film,
  Globe2,
  Building2,
  CheckCircle2,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { exerciseApi } from '../../services/exerciseApi'
import type { Exercise, ExerciseFilters as FiltersType } from '../../types/exercise'
import { ExerciseCard } from './ExerciseCard'
import { ExerciseFilters } from './ExerciseFilters'
import { ExerciseDetailsModal } from './ExerciseDetailsModal'
import { CreateExerciseModal } from './CreateExerciseModal'
import { EditExerciseModal } from './EditExerciseModal'
import { AddExerciseVideoModal } from './AddExerciseVideoModal'

export const ExerciseLibraryView: React.FC = () => {
  const { user, token } = useAuth()

  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Filters State
  const [filters, setFilters] = useState<FiltersType>({
    search: '',
    muscle_group: '',
    equipment: '',
    difficulty: undefined,
    exercise_type: undefined,
    is_active: true,
  })

  // Modals
  const [detailsExerciseId, setDetailsExerciseId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)
  const [videoTargetExercise, setVideoTargetExercise] = useState<Exercise | null>(null)

  const canCreate = Boolean(
    user && (user.role === 'super_admin' || user.role === 'gym_admin' || user.role === 'coach')
  )

  const fetchExercises = async (isManualRefresh = false) => {
    if (!token) return
    if (isManualRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const data = await exerciseApi.listExercises(filters, token)
      setExercises(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load exercises.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchExercises()
  }, [token, filters])

  // Statistics
  const stats = useMemo(() => {
    const total = exercises.length
    const platformCount = exercises.filter((e) => e.tenant_id === null || e.tenant_id === undefined).length
    const gymCount = exercises.filter((e) => e.tenant_id !== null && e.tenant_id !== undefined).length
    const withVideos = exercises.filter((e) => e.videos_count > 0).length
    return { total, platformCount, gymCount, withVideos }
  }, [exercises])

  const handleDeleteExercise = async (exercise: Exercise) => {
    if (!token) return
    const confirmed = window.confirm(
      `Are you sure you want to remove "${exercise.name}"? If it has been used in workout plans, it will be safely archived instead of deleted.`
    )
    if (!confirmed) return

    try {
      const res = await exerciseApi.deleteExercise(exercise.id, token)
      setSuccessMessage(res.message)
      setTimeout(() => setSuccessMessage(null), 5000)
      fetchExercises(true)
    } catch (err: any) {
      alert(err.message || 'Failed to delete exercise.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/20">
            <Dumbbell className="h-6 w-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight sm:text-2xl flex items-center gap-2">
              Exercise & Video Library
              {user?.role === 'super_admin' && (
                <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-xs font-semibold text-sky-400 border border-sky-500/20">
                  Platform Admin
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-400 sm:text-sm">
              {user?.role === 'super_admin'
                ? 'Manage global standard library movements and review tenant libraries.'
                : user?.role === 'client'
                ? 'Master workout movements with instructional technique guides and video tutorials.'
                : 'Browse standard exercises and create custom movements for your clients.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchExercises(true)}
            disabled={refreshing || loading}
            title="Refresh library"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-300 transition hover:bg-slate-700 hover:text-white disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          {canCreate && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-500 cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Add Movement
            </button>
          )}
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs font-medium text-emerald-400 shadow-sm animate-fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs font-medium text-rose-400 shadow-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Movements</span>
            <Dumbbell className="h-4 w-4 text-slate-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white tracking-tight">{stats.total}</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Platform Standard</span>
            <Globe2 className="h-4 w-4 text-sky-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-sky-400 tracking-tight">{stats.platformCount}</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Gym Custom</span>
            <Building2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-400 tracking-tight">{stats.gymCount}</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">With Videos</span>
            <Film className="h-4 w-4 text-purple-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-purple-400 tracking-tight">{stats.withVideos}</p>
        </div>
      </div>

      {/* Filters & Search Component */}
      <ExerciseFilters
        filters={filters}
        onChange={setFilters}
        onReset={() =>
          setFilters({
            search: '',
            muscle_group: '',
            equipment: '',
            difficulty: undefined,
            exercise_type: undefined,
            is_active: true,
          })
        }
      />

      {/* Exercises Grid / List */}
      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-sm">Loading movement library...</p>
        </div>
      ) : exercises.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center">
          <Dumbbell className="mx-auto h-12 w-12 text-slate-600 mb-3" />
          <h3 className="text-base font-bold text-white">No Exercises Found</h3>
          <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
            {filters.search || filters.muscle_group || filters.equipment
              ? 'No exercises match your search and filter criteria. Try resetting the filters.'
              : 'No exercises are available in the library yet.'}
          </p>
          {canCreate && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-500 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Create First Exercise
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {exercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              currentUser={user}
              onViewDetails={(ex) => setDetailsExerciseId(ex.id)}
              onEdit={(ex) => setEditingExercise(ex)}
              onDelete={handleDeleteExercise}
              onAddVideo={(ex) => setVideoTargetExercise(ex)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {detailsExerciseId && (
        <ExerciseDetailsModal
          exerciseId={detailsExerciseId}
          currentUser={user}
          token={token}
          onClose={() => setDetailsExerciseId(null)}
          onAddVideo={(ex) => {
            setDetailsExerciseId(null)
            setVideoTargetExercise(ex)
          }}
          onExerciseUpdated={() => fetchExercises(true)}
        />
      )}

      {showCreateModal && user && token && (
        <CreateExerciseModal
          currentUser={user}
          token={token}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setSuccessMessage('New movement added to the library!')
            setTimeout(() => setSuccessMessage(null), 4000)
            fetchExercises(true)
          }}
        />
      )}

      {editingExercise && token && (
        <EditExerciseModal
          exercise={editingExercise}
          token={token}
          onClose={() => setEditingExercise(null)}
          onUpdated={() => {
            setSuccessMessage(`Updated "${editingExercise.name}" successfully!`)
            setTimeout(() => setSuccessMessage(null), 4000)
            fetchExercises(true)
          }}
        />
      )}

      {videoTargetExercise && token && (
        <AddExerciseVideoModal
          exercise={videoTargetExercise}
          token={token}
          onClose={() => setVideoTargetExercise(null)}
          onVideoAdded={() => {
            setSuccessMessage(`Technique video attached to "${videoTargetExercise.name}"!`)
            setTimeout(() => setSuccessMessage(null), 4000)
            fetchExercises(true)
          }}
        />
      )}
    </div>
  )
}
