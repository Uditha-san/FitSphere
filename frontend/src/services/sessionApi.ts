import type {
  TrainingSession,
  SessionCreatePayload,
  SessionUpdatePayload,
  SessionFilterParams,
} from '../types/session'

class SessionApiService {
  private baseUrl: string

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl
  }

  private getHeaders(token: string): HeadersInit {
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    }
  }

  async listSessions(
    params: SessionFilterParams = {},
    token: string
  ): Promise<TrainingSession[]> {
    const query = new URLSearchParams()
    if (params.coach_id) query.set('coach_id', params.coach_id)
    if (params.client_id) query.set('client_id', params.client_id)
    if (params.tenant_id) query.set('tenant_id', params.tenant_id)
    if (params.status) query.set('status', params.status)
    if (params.date_from) query.set('date_from', params.date_from)
    if (params.date_to) query.set('date_to', params.date_to)
    if (params.skip !== undefined) query.set('skip', String(params.skip))
    if (params.limit !== undefined) query.set('limit', String(params.limit))

    const url = `${this.baseUrl}/api/v1/sessions/${query.toString() ? `?${query.toString()}` : ''}`
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(token),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `Failed to fetch sessions (${response.status})`)
    }

    return response.json()
  }

  async getSession(id: string, token: string): Promise<TrainingSession> {
    const response = await fetch(`${this.baseUrl}/api/v1/sessions/${id}`, {
      method: 'GET',
      headers: this.getHeaders(token),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `Failed to fetch session (${response.status})`)
    }

    return response.json()
  }

  async createSession(
    payload: SessionCreatePayload,
    token: string
  ): Promise<TrainingSession> {
    const response = await fetch(`${this.baseUrl}/api/v1/sessions/`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `Failed to schedule session (${response.status})`)
    }

    return response.json()
  }

  async updateSession(
    id: string,
    payload: SessionUpdatePayload,
    token: string
  ): Promise<TrainingSession> {
    const response = await fetch(`${this.baseUrl}/api/v1/sessions/${id}`, {
      method: 'PATCH',
      headers: this.getHeaders(token),
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `Failed to update session (${response.status})`)
    }

    return response.json()
  }

  async confirmSession(id: string, token: string): Promise<TrainingSession> {
    const response = await fetch(`${this.baseUrl}/api/v1/sessions/${id}/confirm`, {
      method: 'POST',
      headers: this.getHeaders(token),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `Failed to confirm session (${response.status})`)
    }

    return response.json()
  }

  async startSession(id: string, token: string): Promise<TrainingSession> {
    const response = await fetch(`${this.baseUrl}/api/v1/sessions/${id}/start`, {
      method: 'POST',
      headers: this.getHeaders(token),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `Failed to start session (${response.status})`)
    }

    return response.json()
  }

  async completeSession(id: string, token: string): Promise<TrainingSession> {
    const response = await fetch(`${this.baseUrl}/api/v1/sessions/${id}/complete`, {
      method: 'POST',
      headers: this.getHeaders(token),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `Failed to complete session (${response.status})`)
    }

    return response.json()
  }

  async cancelSession(id: string, token: string): Promise<TrainingSession> {
    const response = await fetch(`${this.baseUrl}/api/v1/sessions/${id}/cancel`, {
      method: 'POST',
      headers: this.getHeaders(token),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `Failed to cancel session (${response.status})`)
    }

    return response.json()
  }

  async markNoShow(id: string, token: string): Promise<TrainingSession> {
    const response = await fetch(`${this.baseUrl}/api/v1/sessions/${id}/no-show`, {
      method: 'POST',
      headers: this.getHeaders(token),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `Failed to mark session as no-show (${response.status})`)
    }

    return response.json()
  }
}

export const sessionApi = new SessionApiService()
export default sessionApi
