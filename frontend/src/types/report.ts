import type { UserSummary } from './assignment'
import type { ProgressRecord, TrainingPlanBrief } from './progress'

export type ReportPeriodType =
  | 'all_time'
  | 'last_7_days'
  | 'last_30_days'
  | 'last_90_days'
  | 'custom'

export interface ReportPeriodInfo {
  period_type: ReportPeriodType
  start_date: string | null
  end_date: string | null
}

export interface SessionStatistics {
  total: number
  completed: number
  cancelled: number
  no_show: number
  scheduled: number
  in_progress: number
  eligible_outcome: number
  completion_rate: number
}

export interface SessionDatePoint {
  date: string
  total: number
  completed: number
  cancelled: number
}

export interface ProgressMetricChange {
  earliest_value: string | number | null
  latest_value: string | number | null
  change: string | number | null
  earliest_date: string | null
  latest_date: string | null
}

export interface ProgressChartPoint {
  recorded_at: string
  weight_kg: string | number | null
  body_fat_percentage: string | number | null
  chest_cm: string | number | null
  waist_cm: string | number | null
  hip_cm: string | number | null
  arm_cm: string | number | null
  thigh_cm: string | number | null
}

export interface ClientOverviewReport {
  client_id: string
  client_name: string | null
  client_email: string
  assigned_coach: UserSummary | null
  active_training_plan: TrainingPlanBrief | null
  session_stats: SessionStatistics
  total_progress_records: number
  latest_progress: ProgressRecord | null
}

export interface ClientProgressReport {
  client_id: string
  client_name: string | null
  period: ReportPeriodInfo
  total_records: number
  weight: ProgressMetricChange
  body_fat_percentage: ProgressMetricChange
  chest_cm: ProgressMetricChange
  waist_cm: ProgressMetricChange
  hip_cm: ProgressMetricChange
  arm_cm: ProgressMetricChange
  thigh_cm: ProgressMetricChange
  history: ProgressChartPoint[]
}

export interface ClientTrainingReport {
  client_id: string
  client_name: string | null
  period: ReportPeriodInfo
  session_stats: SessionStatistics
  activity_by_date: SessionDatePoint[]
}

export interface CoachOverviewReport {
  coach_id: string
  coach_name: string | null
  coach_email: string
  total_assigned_clients: number
  active_assigned_clients: number
  total_training_plans: number
  active_training_plans: number
  session_stats: SessionStatistics
}

export interface CoachClientSummary {
  client_id: string
  client_name: string | null
  email: string
  is_active_assignment: boolean
  active_plan_name: string | null
  sessions_completed: number
  sessions_upcoming: number
  last_progress_date: string | null
  latest_weight_kg: string | number | null
  latest_body_fat_percentage: string | number | null
}

export interface GymOverviewReport {
  tenant_id: string
  tenant_name: string
  total_clients: number
  total_coaches: number
  active_assignments: number
  total_training_plans: number
  active_training_plans: number
  session_stats: SessionStatistics
  total_progress_records: number
}

export interface GymClientSummary {
  client_id: string
  client_name: string | null
  email: string
  assigned_coach_name: string | null
  active_plan_name: string | null
  total_sessions: number
  completed_sessions: number
  upcoming_sessions: number
  latest_progress_date: string | null
}

export interface GymCoachSummary {
  coach_id: string
  coach_name: string | null
  email: string
  assigned_clients_count: number
  active_clients_count: number
  training_plans_count: number
  total_sessions: number
  completed_sessions: number
  upcoming_sessions: number
  completion_rate: number
}

export interface GymSessionReport {
  tenant_id: string
  tenant_name: string
  period: ReportPeriodInfo
  session_stats: SessionStatistics
  activity_by_date: SessionDatePoint[]
}

export interface PlatformOverviewReport {
  total_gyms: number
  total_users: number
  total_clients: number
  total_coaches: number
  total_gym_admins: number
  total_training_plans: number
  session_stats: SessionStatistics
  total_active_assignments: number
  total_progress_records: number
  total_exercises: number
}

export interface TenantSummaryReport {
  tenant_id: string
  name: string
  slug: string
  is_active: boolean
  total_users: number
  total_clients: number
  total_coaches: number
  total_training_plans: number
  total_sessions: number
  completed_sessions: number
  active_assignments: number
}
