import type {
  TrainingPlan,
  TrainingPlanSummary,
  TrainingPlanCreatePayload,
  TrainingPlanUpdatePayload,
  WorkoutDay,
  WorkoutDayCreatePayload,
  WorkoutDayUpdatePayload,
  WorkoutExercise,
  WorkoutExerciseCreatePayload,
  WorkoutExerciseUpdatePayload,
} from '../types/trainingPlan'

class TrainingPlanApiService {
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

  async listPlans(
    params: {
      coach_id?: string
      client_id?: string
      tenant_id?: string
      status?: string
      skip?: number
      limit?: number
    } = {},
    token: string
  ): Promise<TrainingPlanSummary[]> {
    const query = new URLSearchParams()
    if (params.coach_id) query.set('coach_id', params.coach_id)
    if (params.client_id) query.set('client_id', params.client_id)
    if (params.tenant_id) query.set('tenant_id', params.tenant_id)
    if (params.status) query.set('status', params.status)
    if (params.skip !== undefined) query.set('skip', String(params.skip))
    if (params.limit !== undefined) query.set('limit', String(params.limit))

    const url = `${this.baseUrl}/api/v1/training-plans/${query.toString() ? `?${query.toString()}` : ''}`
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(token),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `Failed to fetch training plans (${response.status})`)
    }

    return response.json()
  }

  async getPlan(id: string, token: string): Promise<TrainingPlan> {
    const response = await fetch(`${this.baseUrl}/api/v1/training-plans/${id}`, {
      method: 'GET',
      headers: this.getHeaders(token),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `Failed to fetch training plan (${response.status})`)
    }

    return response.json()
  }

  async createPlan(
    payload: TrainingPlanCreatePayload,
    token: string
  ): Promise<TrainingPlan> {
    const response = await fetch(`${this.baseUrl}/api/v1/training-plans/`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `Failed to create training plan (${response.status})`)
    }

    return response.json()
  }

  async updatePlan(
    id: string,
    payload: TrainingPlanUpdatePayload,
    token: string
  ): Promise<TrainingPlan> {
    const response = await fetch(`${this.baseUrl}/api/v1/training-plans/${id}`, {
      method: 'PATCH',
      headers: this.getHeaders(token),
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `Failed to update training plan (${response.status})`)
    }

    return response.json()
  }

  async archivePlan(id: string, token: string): Promise<TrainingPlan> {
    const response = await fetch(`${this.baseUrl}/api/v1/training-plans/${id}/archive`, {
      method: 'POST',
      headers: this.getHeaders(token),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `Failed to archive training plan (${response.status})`)
    }

    return response.json()
  }

  async addWorkoutDay(
    planId: string,
    payload: WorkoutDayCreatePayload,
    token: string
  ): Promise<WorkoutDay> {
    const response = await fetch(`${this.baseUrl}/api/v1/training-plans/${planId}/days`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `Failed to add workout day (${response.status})`)
    }

    return response.json()
  }

  async updateWorkoutDay(
    dayId: string,
    payload: WorkoutDayUpdatePayload,
    token: string
  ): Promise<WorkoutDay> {
    const response = await fetch(`${this.baseUrl}/api/v1/training-plans/days/${dayId}`, {
      method: 'PUT',
      headers: this.getHeaders(token),
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `Failed to update workout day (${response.status})`)
    }

    return response.json()
  }

  async deleteWorkoutDay(dayId: string, token: string): Promise<WorkoutDay> {
    const response = await fetch(`${this.baseUrl}/api/v1/training-plans/days/${dayId}`, {
      method: 'DELETE',
      headers: this.getHeaders(token),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `Failed to delete workout day (${response.status})`)
    }

    return response.json()
  }

  async addExercise(
    dayId: string,
    payload: WorkoutExerciseCreatePayload,
    token: string
  ): Promise<WorkoutExercise> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/training-plans/days/${dayId}/exercises`,
      {
        method: 'POST',
        headers: this.getHeaders(token),
        body: JSON.stringify(payload),
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `Failed to add exercise (${response.status})`)
    }

    return response.json()
  }

  async updateExercise(
    exerciseId: string,
    payload: WorkoutExerciseUpdatePayload,
    token: string
  ): Promise<WorkoutExercise> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/training-plans/exercises/${exerciseId}`,
      {
        method: 'PUT',
        headers: this.getHeaders(token),
        body: JSON.stringify(payload),
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `Failed to update exercise (${response.status})`)
    }

    return response.json()
  }

  async deleteExercise(exerciseId: string, token: string): Promise<WorkoutExercise> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/training-plans/exercises/${exerciseId}`,
      {
        method: 'DELETE',
        headers: this.getHeaders(token),
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `Failed to delete exercise (${response.status})`)
    }

    return response.json()
  }
}

export const trainingPlanApiService = new TrainingPlanApiService()
export const trainingPlanApi = trainingPlanApiService
export default trainingPlanApiService
