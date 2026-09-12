export interface DatabaseHealth {
  status: string
  latency_ms: number | null
  error: string | null
}

export interface HealthResponse {
  status: string
  project: string
  environment: string
  database: DatabaseHealth
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  status: number
}
