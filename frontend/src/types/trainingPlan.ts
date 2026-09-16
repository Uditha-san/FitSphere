import type { User } from './auth'
import type { Exercise } from './exercise'

export type PlanStatus = 'draft' | 'active' | 'completed' | 'archived'

export interface WorkoutExercise {
  id: string
  workout_day_id: string
  tenant_id: string
  exercise_id?: string | null
  exercise_name: string
  description?: string | null
  sets: number
  repetitions: string
  duration_seconds?: number | null
  rest_seconds: number
  notes?: string | null
  order_index: number
  created_at: string
  updated_at: string
  exercise?: Exercise | null
}

export interface WorkoutDay {
  id: string
  training_plan_id: string
  tenant_id: string
  name: string
  description?: string | null
  day_number?: number | null
  order_index: number
  created_at: string
  updated_at: string
  exercises: WorkoutExercise[]
}

export interface TrainingPlanSummary {
  id: string
  tenant_id: string
  coach_id: string
  client_id: string
  name: string
  description?: string | null
  status: PlanStatus
  start_date?: string | null
  end_date?: string | null
  created_at: string
  updated_at: string
  coach?: User | null
  client?: User | null
  days_count: number
}

export interface TrainingPlan {
  id: string
  tenant_id: string
  coach_id: string
  client_id: string
  name: string
  description?: string | null
  status: PlanStatus
  start_date?: string | null
  end_date?: string | null
  created_at: string
  updated_at: string
  coach?: User | null
  client?: User | null
  workout_days: WorkoutDay[]
}

export interface TrainingPlanCreatePayload {
  client_id: string
  coach_id?: string
  name: string
  description?: string
  status?: PlanStatus
  start_date?: string
  end_date?: string
}

export interface TrainingPlanUpdatePayload {
  name?: string
  description?: string
  status?: PlanStatus
  start_date?: string
  end_date?: string
}

export interface WorkoutDayCreatePayload {
  name: string
  description?: string
  day_number?: number
  order_index?: number
}

export interface WorkoutDayUpdatePayload {
  name?: string
  description?: string
  day_number?: number
  order_index?: number
}

export interface WorkoutExerciseCreatePayload {
  exercise_name: string
  exercise_id?: string | null
  description?: string
  sets: number
  repetitions: string
  duration_seconds?: number
  rest_seconds: number
  notes?: string
  order_index?: number
}

export interface WorkoutExerciseUpdatePayload {
  exercise_name?: string
  exercise_id?: string | null
  description?: string
  sets?: number
  repetitions?: string
  duration_seconds?: number
  rest_seconds?: number
  notes?: string
  order_index?: number
}
