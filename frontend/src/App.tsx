import { useState, useEffect, useCallback } from 'react'
import type { HealthResponse } from './types/api'
import { apiService } from './services/api'
import MainLayout from './layouts/MainLayout'
import DevDashboard from './features/dashboard'

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [lastChecked, setLastChecked] = useState<string>('')
  const [apiError, setApiError] = useState<string | null>(null)

  const checkHealth = useCallback(async () => {
    setLoading(true)
    setApiError(null)
    try {
      const data = await apiService.getHealthStatus()
      setHealth(data)
    } catch (err: any) {
      setApiError(err.message || 'Failed to connect to backend service')
      setHealth(null)
    } finally {
      setLoading(false)
      setLastChecked(new Date().toLocaleTimeString())
    }
  }, [])

  useEffect(() => {
    checkHealth()
  }, [checkHealth])

  return (
    <MainLayout loading={loading} onRefresh={checkHealth}>
      <DevDashboard
        health={health}
        lastChecked={lastChecked}
        apiError={apiError}
      />
    </MainLayout>
  )
}
