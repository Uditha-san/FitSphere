import type { LoginCredentials, TokenResponse, User } from '../types/auth'

class AuthApiService {
  private baseUrl: string

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl
  }

  async login(credentials: LoginCredentials): Promise<TokenResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(credentials),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const message = errorData.detail || `Login failed with status: ${response.status}`
      throw new Error(message)
    }

    return response.json()
  }

  async getMe(token: string): Promise<User> {
    const response = await fetch(`${this.baseUrl}/api/v1/auth/me`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const message = errorData.detail || `Failed to fetch user profile (${response.status})`
      throw new Error(message)
    }

    return response.json()
  }
}

export const authApiService = new AuthApiService()
export default authApiService
