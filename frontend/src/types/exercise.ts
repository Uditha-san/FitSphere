import type { User } from './auth'

export type Difficulty = 'beginner' | 'intermediate' | 'advanced'
export type ExerciseType = 'strength' | 'cardio' | 'mobility' | 'stretching' | 'core'

export interface ExerciseVideo {
  id: string
  exercise_id: string
  title: string
  description?: string | null
  video_url: string
  thumbnail_url?: string | null
  duration_seconds?: number | null
  is_primary: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Exercise {
  id: string
  tenant_id?: string | null
  name: string
  description?: string | null
  instructions?: string | null
  muscle_group: string
  secondary_muscle_group?: string | null
  equipment: string
  difficulty: Difficulty
  exercise_type: ExerciseType
  is_active: boolean
  created_by?: string | null
  created_at: string
  updated_at: string
  primary_video?: ExerciseVideo | null
  videos_count: number
  creator?: User | null
  videos?: ExerciseVideo[]
}

export interface ExerciseFilters {
  search?: string
  muscle_group?: string
  equipment?: string
  difficulty?: Difficulty
  exercise_type?: ExerciseType
  is_active?: boolean
  skip?: number
  limit?: number
}

export interface ExerciseCreatePayload {
  name: string
  description?: string
  instructions?: string
  muscle_group: string
  secondary_muscle_group?: string
  equipment: string
  difficulty?: Difficulty
  exercise_type?: ExerciseType
  tenant_id?: string | null
  videos?: {
    title: string
    description?: string
    video_url: string
    thumbnail_url?: string
    duration_seconds?: number
    is_primary?: boolean
  }[]
}

export interface ExerciseUpdatePayload {
  name?: string
  description?: string
  instructions?: string
  muscle_group?: string
  secondary_muscle_group?: string
  equipment?: string
  difficulty?: Difficulty
  exercise_type?: ExerciseType
  is_active?: boolean
}

export interface ExerciseVideoCreatePayload {
  title: string
  description?: string
  video_url: string
  thumbnail_url?: string
  duration_seconds?: number
  is_primary?: boolean
}

export interface ExerciseVideoUpdatePayload {
  title?: string
  description?: string
  video_url?: string
  thumbnail_url?: string
  duration_seconds?: number
  is_primary?: boolean
  is_active?: boolean
}

export interface ExerciseDeleteResponse {
  action: 'deleted' | 'deactivated'
  message: string
  exercise_id: string
  is_active: boolean
}
