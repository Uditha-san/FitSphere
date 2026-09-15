import type { User } from './auth'

export type SessionStatus =
  | 'scheduled'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export type SessionType =
  | 'personal_training'
  | 'group_training'
  | 'assessment'
  | 'consultation'

export interface TrainingPlanBrief {
  id: string
  name: string
  status: string
}

export interface WorkoutDayBrief {
  id: string
  name: string
  day_number?: number | null
  order_index: number
}

export interface TrainingSession {
  id: string
  tenant_id: string
  coach_id: string
  client_id: string
  training_plan_id?: string | null
  workout_day_id?: string | null
  scheduled_start: string
  scheduled_end: string
  status: SessionStatus
  session_type: SessionType
  notes?: string | null
  created_at: string
  updated_at: string
  coach?: User | null
  client?: User | null
  training_plan?: TrainingPlanBrief | null
  workout_day?: WorkoutDayBrief | null
}

export interface SessionCreatePayload {
  client_id: string
  coach_id?: string
  tenant_id?: string
  training_plan_id?: string | null
  workout_day_id?: string | null
  scheduled_start: string
  scheduled_end: string
  session_type?: SessionType | string
  notes?: string | null
}

export interface SessionUpdatePayload {
  scheduled_start?: string
  scheduled_end?: string
  session_type?: SessionType | string
  training_plan_id?: string | null
  workout_day_id?: string | null
  notes?: string | null
}

export interface SessionFilterParams {
  coach_id?: string
  client_id?: string
  tenant_id?: string
  status?: string
  date_from?: string
  date_to?: string
  skip?: number
  limit?: number
}
