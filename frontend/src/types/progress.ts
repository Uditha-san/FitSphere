import type { User } from './auth'

export interface TrainingSessionBrief {
  id: string
  session_type: string
  scheduled_start: string
  status: string
}

export interface TrainingPlanBrief {
  id: string
  name: string
  status: string
}

export interface ProgressRecord {
  id: string
  tenant_id: string
  coach_id: string
  client_id: string
  recorded_at: string
  weight_kg?: number | null
  body_fat_percentage?: number | null
  chest_cm?: number | null
  waist_cm?: number | null
  hip_cm?: number | null
  arm_cm?: number | null
  thigh_cm?: number | null
  notes?: string | null
  training_session_id?: string | null
  training_plan_id?: string | null
  created_at: string
  updated_at: string
  coach?: User | null
  client?: User | null
  training_session?: TrainingSessionBrief | null
  training_plan?: TrainingPlanBrief | null
}

export interface ProgressRecordCreatePayload {
  client_id: string
  coach_id?: string
  tenant_id?: string
  recorded_at: string
  weight_kg?: number | null
  body_fat_percentage?: number | null
  chest_cm?: number | null
  waist_cm?: number | null
  hip_cm?: number | null
  arm_cm?: number | null
  thigh_cm?: number | null
  notes?: string | null
  training_session_id?: string | null
  training_plan_id?: string | null
}

export interface ProgressRecordUpdatePayload {
  recorded_at?: string
  weight_kg?: number | null
  body_fat_percentage?: number | null
  chest_cm?: number | null
  waist_cm?: number | null
  hip_cm?: number | null
  arm_cm?: number | null
  thigh_cm?: number | null
  notes?: string | null
  training_session_id?: string | null
  training_plan_id?: string | null
}

export interface ProgressLatestSummary {
  client_id: string
  latest_record?: ProgressRecord | null
  total_records: number
  first_recorded_at?: string | null
  last_recorded_at?: string | null
  weight_change_kg?: number | null
  body_fat_change_percentage?: number | null
}

export interface ProgressFilterParams {
  coach_id?: string
  client_id?: string
  date_from?: string
  date_to?: string
  skip?: number
  limit?: number
}
