import type { HealthResponse } from '../types/api'

class ApiService {
  private baseUrl: string

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl
  }

  async getHealthStatus(): Promise<HealthResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Health check failed with status: ${response.status}`)
    }

    return response.json()
  }
}

export const apiService = new ApiService()
export default apiService
