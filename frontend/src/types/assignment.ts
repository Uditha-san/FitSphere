import type { UserRole } from './auth'

export interface UserSummary {
  id: string
  email: string
  full_name: string | null
  role: UserRole
}

export interface CoachClientAssignment {
  id: string
  tenant_id: string
  coach_id: string
  client_id: string
  is_active: boolean
  created_at: string
  updated_at: string
  coach?: UserSummary | null
  client?: UserSummary | null
}

export interface AssignmentCreatePayload {
  coach_id: string
  client_id: string
  tenant_id?: string | null
}

export interface AssignmentFilterParams {
  coach_id?: string
  client_id?: string
  tenant_id?: string
  is_active?: boolean
  skip?: number
  limit?: number
}

export interface Tenant {
  id: string
  name: string
  slug: string
  is_active: boolean
  created_at: string
  updated_at: string
}
