import type {
  Exercise,
  ExerciseFilters,
  ExerciseCreatePayload,
  ExerciseUpdatePayload,
  ExerciseVideo,
  ExerciseVideoCreatePayload,
  ExerciseVideoUpdatePayload,
  ExerciseDeleteResponse,
} from '../types/exercise'

class ExerciseApiService {
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

  async listExercises(
    filters: ExerciseFilters = {},
    token: string
  ): Promise<Exercise[]> {
    const query = new URLSearchParams()
    if (filters.search) query.set('search', filters.search)
    if (filters.muscle_group) query.set('muscle_group', filters.muscle_group)
    if (filters.equipment) query.set('equipment', filters.equipment)
    if (filters.difficulty) query.set('difficulty', filters.difficulty)
    if (filters.exercise_type) query.set('exercise_type', filters.exercise_type)
    if (filters.is_active !== undefined) query.set('is_active', String(filters.is_active))
    if (filters.skip !== undefined) query.set('skip', String(filters.skip))
    if (filters.limit !== undefined) query.set('limit', String(filters.limit))

    const url = `${this.baseUrl}/api/v1/exercises/${query.toString() ? `?${query.toString()}` : ''}`
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(token),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `Failed to fetch exercises (${response.status})`)
    }

    return response.json()
  }

  async getExercise(id: string, token: string): Promise<Exercise> {
    const response = await fetch(`${this.baseUrl}/api/v1/exercises/${id}`, {
      method: 'GET',
      headers: this.getHeaders(token),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `Failed to fetch exercise (${response.status})`)
    }

    return response.json()
  }

  async createExercise(
    payload: ExerciseCreatePayload,
    token: string
  ): Promise<Exercise> {
    const response = await fetch(`${this.baseUrl}/api/v1/exercises/`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `Failed to create exercise (${response.status})`)
    }

    return response.json()
  }

  async updateExercise(
    id: string,
    payload: ExerciseUpdatePayload,
    token: string
  ): Promise<Exercise> {
    const response = await fetch(`${this.baseUrl}/api/v1/exercises/${id}`, {
      method: 'PATCH',
      headers: this.getHeaders(token),
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `Failed to update exercise (${response.status})`)
    }

    return response.json()
  }

  async deleteExercise(
    id: string,
    token: string
  ): Promise<ExerciseDeleteResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/exercises/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(token),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `Failed to delete exercise (${response.status})`)
    }

    return response.json()
  }

  async addVideo(
    exerciseId: string,
    payload: ExerciseVideoCreatePayload,
    token: string
  ): Promise<ExerciseVideo> {
    const response = await fetch(`${this.baseUrl}/api/v1/exercises/${exerciseId}/videos`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `Failed to add video (${response.status})`)
    }

    return response.json()
  }

  async listVideos(
    exerciseId: string,
    token: string
  ): Promise<ExerciseVideo[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/exercises/${exerciseId}/videos`, {
      method: 'GET',
      headers: this.getHeaders(token),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `Failed to list videos (${response.status})`)
    }

    return response.json()
  }

  async updateVideo(
    exerciseId: string,
    videoId: string,
    payload: ExerciseVideoUpdatePayload,
    token: string
  ): Promise<ExerciseVideo> {
    const response = await fetch(`${this.baseUrl}/api/v1/exercises/${exerciseId}/videos/${videoId}`, {
      method: 'PATCH',
      headers: this.getHeaders(token),
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `Failed to update video (${response.status})`)
    }

    return response.json()
  }

  async deleteVideo(
    exerciseId: string,
    videoId: string,
    token: string
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/v1/exercises/${exerciseId}/videos/${videoId}`, {
      method: 'DELETE',
      headers: this.getHeaders(token),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `Failed to delete video (${response.status})`)
    }
  }
}

export const exerciseApi = new ExerciseApiService()
