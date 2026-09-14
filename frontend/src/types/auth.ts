export type UserRole = 'super_admin' | 'gym_admin' | 'coach' | 'client'

export interface User {
  id: string
  tenant_id: string | null
  email: string
  full_name: string | null
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user: User
}

export interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
  switchDevUser: (role: UserRole) => Promise<void>
  clearError: () => void
}
