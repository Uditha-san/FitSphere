import React from 'react'
import { Search, X } from 'lucide-react'
import type { Difficulty, ExerciseType, ExerciseFilters as FiltersType } from '../../types/exercise'

interface ExerciseFiltersProps {
  filters: FiltersType
  onChange: (newFilters: FiltersType) => void
  onReset: () => void
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

export const ExerciseFilters: React.FC<ExerciseFiltersProps> = ({
  filters,
  onChange,
  onReset,
}) => {
  const hasActiveFilters = Boolean(
    filters.search ||
      filters.muscle_group ||
      filters.equipment ||
      filters.difficulty ||
      filters.exercise_type ||
      filters.is_active === false
  )

  return (
    <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg backdrop-blur-sm sm:p-5">
      {/* Search Input Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search exercises by name, description, or muscle group..."
            value={filters.search || ''}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pr-10 pl-10 text-sm text-white placeholder-slate-500 transition focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          {filters.search && (
            <button
              onClick={() => onChange({ ...filters, search: '' })}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white cursor-pointer"
          >
            <X className="h-3.5 w-3.5" /> Reset Filters
          </button>
        )}
      </div>

      {/* Filter Dropdowns Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Muscle Group */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-400">Muscle Group</label>
          <select
            value={filters.muscle_group || ''}
            onChange={(e) => onChange({ ...filters, muscle_group: e.target.value || undefined })}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 transition focus:border-emerald-500 focus:outline-none"
          >
            <option value="">All Muscles</option>
            {MUSCLE_GROUPS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Equipment */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-400">Equipment</label>
          <select
            value={filters.equipment || ''}
            onChange={(e) => onChange({ ...filters, equipment: e.target.value || undefined })}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 transition focus:border-emerald-500 focus:outline-none"
          >
            <option value="">All Equipment</option>
            {EQUIPMENT_LIST.map((eq) => (
              <option key={eq} value={eq}>
                {eq}
              </option>
            ))}
          </select>
        </div>

        {/* Difficulty */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-400">Difficulty</label>
          <select
            value={filters.difficulty || ''}
            onChange={(e) =>
              onChange({ ...filters, difficulty: (e.target.value as Difficulty) || undefined })
            }
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 transition focus:border-emerald-500 focus:outline-none"
          >
            <option value="">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        {/* Exercise Type */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-400">Exercise Type</label>
          <select
            value={filters.exercise_type || ''}
            onChange={(e) =>
              onChange({ ...filters, exercise_type: (e.target.value as ExerciseType) || undefined })
            }
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 transition focus:border-emerald-500 focus:outline-none"
          >
            <option value="">All Types</option>
            <option value="strength">Strength</option>
            <option value="cardio">Cardio</option>
            <option value="mobility">Mobility</option>
            <option value="stretching">Stretching</option>
            <option value="core">Core</option>
          </select>
        </div>
      </div>
    </div>
  )
}
