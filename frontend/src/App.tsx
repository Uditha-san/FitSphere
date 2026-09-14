import { useState, useEffect, useCallback } from 'react'
import type { HealthResponse } from './types/api'
import { apiService } from './services/api'
import MainLayout from './layouts/MainLayout'
import DevDashboard from './features/dashboard'
import AssignmentsView from './features/assignments/AssignmentsView'
import { AuthProvider } from './context/AuthContext'

function AppContent() {
  const [activeTab, setActiveTab] = useState<'assignments' | 'health'>('assignments')
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
    <MainLayout
      loading={loading}
      onRefresh={checkHealth}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
    >
      {activeTab === 'assignments' ? (
        <AssignmentsView />
      ) : (
        <DevDashboard
          health={health}
          lastChecked={lastChecked}
          apiError={apiError}
        />
      )}
    </MainLayout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
