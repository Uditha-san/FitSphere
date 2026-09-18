import type {
  ReportPeriodType,
  ClientOverviewReport,
  ClientProgressReport,
  ClientTrainingReport,
  CoachOverviewReport,
  CoachClientSummary,
  GymOverviewReport,
  GymClientSummary,
  GymCoachSummary,
  GymSessionReport,
  PlatformOverviewReport,
  TenantSummaryReport,
} from '../types/report'

class ReportApiService {
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

  // --- Client Reports ---

  async getClientOverview(clientId?: string, token?: string): Promise<ClientOverviewReport> {
    const query = clientId ? `?client_id=${encodeURIComponent(clientId)}` : ''
    const response = await fetch(`${this.baseUrl}/api/v1/reports/client/overview${query}`, {
      method: 'GET',
      headers: this.getHeaders(token || ''),
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.detail || `Failed to fetch client overview (${response.status})`)
    }
    return response.json()
  }

  async getClientProgress(
    params: {
      clientId?: string
      period?: ReportPeriodType
      startDate?: string
      endDate?: string
    } = {},
    token?: string
  ): Promise<ClientProgressReport> {
    const q = new URLSearchParams()
    if (params.clientId) q.set('client_id', params.clientId)
    if (params.period) q.set('period', params.period)
    if (params.startDate) q.set('start_date', params.startDate)
    if (params.endDate) q.set('end_date', params.endDate)

    const response = await fetch(
      `${this.baseUrl}/api/v1/reports/client/progress${q.toString() ? `?${q.toString()}` : ''}`,
      {
        method: 'GET',
        headers: this.getHeaders(token || ''),
      }
    )
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.detail || `Failed to fetch client progress report (${response.status})`)
    }
    return response.json()
  }

  async getClientTraining(
    params: {
      clientId?: string
      period?: ReportPeriodType
      startDate?: string
      endDate?: string
    } = {},
    token?: string
  ): Promise<ClientTrainingReport> {
    const q = new URLSearchParams()
    if (params.clientId) q.set('client_id', params.clientId)
    if (params.period) q.set('period', params.period)
    if (params.startDate) q.set('start_date', params.startDate)
    if (params.endDate) q.set('end_date', params.endDate)

    const response = await fetch(
      `${this.baseUrl}/api/v1/reports/client/training${q.toString() ? `?${q.toString()}` : ''}`,
      {
        method: 'GET',
        headers: this.getHeaders(token || ''),
      }
    )
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.detail || `Failed to fetch client training report (${response.status})`)
    }
    return response.json()
  }

  // --- Coach Reports ---

  async getCoachOverview(token: string): Promise<CoachOverviewReport> {
    const response = await fetch(`${this.baseUrl}/api/v1/reports/coach/overview`, {
      method: 'GET',
      headers: this.getHeaders(token),
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.detail || `Failed to fetch coach overview (${response.status})`)
    }
    return response.json()
  }

  async getCoachClients(
    params: { skip?: number; limit?: number } = {},
    token: string
  ): Promise<CoachClientSummary[]> {
    const q = new URLSearchParams()
    if (params.skip !== undefined) q.set('skip', String(params.skip))
    if (params.limit !== undefined) q.set('limit', String(params.limit))

    const response = await fetch(
      `${this.baseUrl}/api/v1/reports/coach/clients${q.toString() ? `?${q.toString()}` : ''}`,
      {
        method: 'GET',
        headers: this.getHeaders(token),
      }
    )
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.detail || `Failed to fetch coach clients report (${response.status})`)
    }
    return response.json()
  }

  async getCoachClientDeepDive(clientId: string, token: string): Promise<ClientOverviewReport> {
    const response = await fetch(`${this.baseUrl}/api/v1/reports/coach/clients/${clientId}`, {
      method: 'GET',
      headers: this.getHeaders(token),
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.detail || `Failed to fetch athlete report (${response.status})`)
    }
    return response.json()
  }

  // --- Gym Admin Reports ---

  async getGymOverview(params: { tenantId?: string } = {}, token: string): Promise<GymOverviewReport> {
    const q = new URLSearchParams()
    if (params.tenantId) q.set('tenant_id', params.tenantId)

    const response = await fetch(
      `${this.baseUrl}/api/v1/reports/gym/overview${q.toString() ? `?${q.toString()}` : ''}`,
      {
        method: 'GET',
        headers: this.getHeaders(token),
      }
    )
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.detail || `Failed to fetch gym overview (${response.status})`)
    }
    return response.json()
  }

  async getGymClients(
    params: { tenantId?: string; skip?: number; limit?: number } = {},
    token: string
  ): Promise<GymClientSummary[]> {
    const q = new URLSearchParams()
    if (params.tenantId) q.set('tenant_id', params.tenantId)
    if (params.skip !== undefined) q.set('skip', String(params.skip))
    if (params.limit !== undefined) q.set('limit', String(params.limit))

    const response = await fetch(
      `${this.baseUrl}/api/v1/reports/gym/clients${q.toString() ? `?${q.toString()}` : ''}`,
      {
        method: 'GET',
        headers: this.getHeaders(token),
      }
    )
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.detail || `Failed to fetch gym clients report (${response.status})`)
    }
    return response.json()
  }

  async getGymCoaches(
    params: { tenantId?: string; skip?: number; limit?: number } = {},
    token: string
  ): Promise<GymCoachSummary[]> {
    const q = new URLSearchParams()
    if (params.tenantId) q.set('tenant_id', params.tenantId)
    if (params.skip !== undefined) q.set('skip', String(params.skip))
    if (params.limit !== undefined) q.set('limit', String(params.limit))

    const response = await fetch(
      `${this.baseUrl}/api/v1/reports/gym/coaches${q.toString() ? `?${q.toString()}` : ''}`,
      {
        method: 'GET',
        headers: this.getHeaders(token),
      }
    )
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.detail || `Failed to fetch gym coaches report (${response.status})`)
    }
    return response.json()
  }

  async getGymSessions(
    params: {
      tenantId?: string
      period?: ReportPeriodType
      startDate?: string
      endDate?: string
    } = {},
    token: string
  ): Promise<GymSessionReport> {
    const q = new URLSearchParams()
    if (params.tenantId) q.set('tenant_id', params.tenantId)
    if (params.period) q.set('period', params.period)
    if (params.startDate) q.set('start_date', params.startDate)
    if (params.endDate) q.set('end_date', params.endDate)

    const response = await fetch(
      `${this.baseUrl}/api/v1/reports/gym/sessions${q.toString() ? `?${q.toString()}` : ''}`,
      {
        method: 'GET',
        headers: this.getHeaders(token),
      }
    )
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.detail || `Failed to fetch gym sessions report (${response.status})`)
    }
    return response.json()
  }

  // --- Super Admin Reports ---

  async getPlatformOverview(token: string): Promise<PlatformOverviewReport> {
    const response = await fetch(`${this.baseUrl}/api/v1/reports/super-admin/overview`, {
      method: 'GET',
      headers: this.getHeaders(token),
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.detail || `Failed to fetch platform overview (${response.status})`)
    }
    return response.json()
  }

  async getTenantsReports(
    params: { search?: string; skip?: number; limit?: number } = {},
    token: string
  ): Promise<TenantSummaryReport[]> {
    const q = new URLSearchParams()
    if (params.search) q.set('search', params.search)
    if (params.skip !== undefined) q.set('skip', String(params.skip))
    if (params.limit !== undefined) q.set('limit', String(params.limit))

    const response = await fetch(
      `${this.baseUrl}/api/v1/reports/super-admin/gyms${q.toString() ? `?${q.toString()}` : ''}`,
      {
        method: 'GET',
        headers: this.getHeaders(token),
      }
    )
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.detail || `Failed to fetch platform gyms reports (${response.status})`)
    }
    return response.json()
  }

  async getSpecificGymReport(tenantId: string, token: string): Promise<GymOverviewReport> {
    const response = await fetch(`${this.baseUrl}/api/v1/reports/super-admin/gyms/${tenantId}`, {
      method: 'GET',
      headers: this.getHeaders(token),
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.detail || `Failed to fetch gym audit report (${response.status})`)
    }
    return response.json()
  }
}

export const reportApi = new ReportApiService()
