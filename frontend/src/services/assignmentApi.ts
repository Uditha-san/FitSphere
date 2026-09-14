import type {
  CoachClientAssignment,
  AssignmentCreatePayload,
  AssignmentFilterParams,
  Tenant,
} from '../types/assignment'
import type { User } from '../types/auth'

class AssignmentApiService {
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

  async listAssignments(
    params: AssignmentFilterParams = {},
    token: string
  ): Promise<CoachClientAssignment[]> {
    const query = new URLSearchParams()
    if (params.is_active !== undefined) query.set('is_active', String(params.is_active))
    if (params.coach_id) query.set('coach_id', params.coach_id)
    if (params.client_id) query.set('client_id', params.client_id)
    if (params.tenant_id) query.set('tenant_id', params.tenant_id)
    if (params.skip !== undefined) query.set('skip', String(params.skip))
    if (params.limit !== undefined) query.set('limit', String(params.limit))

    const url = `${this.baseUrl}/api/v1/assignments/${query.toString() ? `?${query.toString()}` : ''}`
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(token),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `Failed to fetch assignments (${response.status})`)
    }

    return response.json()
  }

  async getAssignment(id: string, token: string): Promise<CoachClientAssignment> {
    const response = await fetch(`${this.baseUrl}/api/v1/assignments/${id}`, {
      method: 'GET',
      headers: this.getHeaders(token),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `Failed to fetch assignment details (${response.status})`)
    }

    return response.json()
  }

  async createAssignment(
    payload: AssignmentCreatePayload,
    token: string
  ): Promise<CoachClientAssignment> {
    const response = await fetch(`${this.baseUrl}/api/v1/assignments/`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `Failed to create assignment (${response.status})`)
    }

    return response.json()
  }

  async deactivateAssignment(id: string, token: string): Promise<CoachClientAssignment> {
    const response = await fetch(`${this.baseUrl}/api/v1/assignments/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(token),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `Failed to deactivate assignment (${response.status})`)
    }

    return response.json()
  }

  async listUsers(params: { tenant_id?: string } = {}, token: string): Promise<User[]> {
    const query = new URLSearchParams()
    if (params.tenant_id) query.set('tenant_id', params.tenant_id)

    const url = `${this.baseUrl}/api/v1/users/${query.toString() ? `?${query.toString()}` : ''}`
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(token),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `Failed to fetch users (${response.status})`)
    }

    return response.json()
  }

  async listTenants(token: string): Promise<Tenant[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/tenants/`, {
      method: 'GET',
      headers: this.getHeaders(token),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `Failed to fetch gym tenants (${response.status})`)
    }

    return response.json()
  }
}

export const assignmentApiService = new AssignmentApiService()
export default assignmentApiService
