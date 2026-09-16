import type {
  ProgressRecord,
  ProgressRecordCreatePayload,
  ProgressRecordUpdatePayload,
  ProgressLatestSummary,
  ProgressFilterParams,
} from '../types/progress'

class ProgressApiService {
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

  async listProgressRecords(
    params: ProgressFilterParams = {},
    token: string
  ): Promise<ProgressRecord[]> {
    const query = new URLSearchParams()
    if (params.coach_id) query.set('coach_id', params.coach_id)
    if (params.client_id) query.set('client_id', params.client_id)
    if (params.date_from) query.set('date_from', params.date_from)
    if (params.date_to) query.set('date_to', params.date_to)
    if (params.skip !== undefined) query.set('skip', String(params.skip))
    if (params.limit !== undefined) query.set('limit', String(params.limit))

    const url = `${this.baseUrl}/api/v1/progress/${query.toString() ? `?${query.toString()}` : ''}`
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(token),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `Failed to fetch progress records (${response.status})`)
    }

    return response.json()
  }

  async getProgressRecord(id: string, token: string): Promise<ProgressRecord> {
    const response = await fetch(`${this.baseUrl}/api/v1/progress/${id}`, {
      method: 'GET',
      headers: this.getHeaders(token),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `Failed to fetch progress record (${response.status})`)
    }

    return response.json()
  }

  async getClientHistory(
    clientId: string,
    params: { date_from?: string; date_to?: string; skip?: number; limit?: number } = {},
    token: string
  ): Promise<ProgressRecord[]> {
    const query = new URLSearchParams()
    if (params.date_from) query.set('date_from', params.date_from)
    if (params.date_to) query.set('date_to', params.date_to)
    if (params.skip !== undefined) query.set('skip', String(params.skip))
    if (params.limit !== undefined) query.set('limit', String(params.limit))

    const url = `${this.baseUrl}/api/v1/progress/clients/${clientId}/history${query.toString() ? `?${query.toString()}` : ''}`
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(token),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `Failed to fetch client progress history (${response.status})`)
    }

    return response.json()
  }

  async getClientSummary(
    clientId: string,
    token: string
  ): Promise<ProgressLatestSummary> {
    const response = await fetch(`${this.baseUrl}/api/v1/progress/clients/${clientId}/latest`, {
      method: 'GET',
      headers: this.getHeaders(token),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `Failed to fetch client progress summary (${response.status})`)
    }

    return response.json()
  }

  async createProgressRecord(
    payload: ProgressRecordCreatePayload,
    token: string
  ): Promise<ProgressRecord> {
    const response = await fetch(`${this.baseUrl}/api/v1/progress/`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      const detail = typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail)
      throw new Error(detail || `Failed to create progress record (${response.status})`)
    }

    return response.json()
  }

  async updateProgressRecord(
    id: string,
    payload: ProgressRecordUpdatePayload,
    token: string
  ): Promise<ProgressRecord> {
    const response = await fetch(`${this.baseUrl}/api/v1/progress/${id}`, {
      method: 'PATCH',
      headers: this.getHeaders(token),
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      const detail = typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail)
      throw new Error(detail || `Failed to update progress record (${response.status})`)
    }

    return response.json()
  }

  async deleteProgressRecord(id: string, token: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/v1/progress/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(token),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `Failed to delete progress record (${response.status})`)
    }
  }
}

export const progressApi = new ProgressApiService()
