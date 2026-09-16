import { useState, useEffect } from 'react'
import {
  PlaySquare,
  BarChart3,
  Settings,
  User as UserIcon,
  Building2,
  Users,
} from 'lucide-react'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './features/auth/LoginPage'
import AppShell from './layouts/AppShell'
import GymAdminDashboard from './features/dashboard/GymAdminDashboard'
import CoachDashboard from './features/dashboard/CoachDashboard'
import ClientDashboard from './features/dashboard/ClientDashboard'
import SuperAdminDashboard from './features/dashboard/SuperAdminDashboard'
import AssignmentsView from './features/assignments/AssignmentsView'
import TrainingPlansView from './features/training-plans/TrainingPlansView'
import SessionsView from './features/sessions/SessionsView'
import ProgressView from './features/progress/ProgressView'
import DevToolsView from './features/dev/DevToolsView'
import FeaturePlaceholder from './features/common/FeaturePlaceholder'

function MainApp() {
  const { isAuthenticated, user } = useAuth()
  const [activeNav, setActiveNav] = useState<string>('dashboard')

  // Reset to dashboard if user switches roles
  useEffect(() => {
    setActiveNav('dashboard')
  }, [user?.role])

  if (!isAuthenticated || !user) {
    return <LoginPage />
  }

  // Render content according to active sidebar navigation
  const renderContent = () => {
    switch (activeNav) {
      case 'dashboard':
        switch (user.role) {
          case 'gym_admin':
            return <GymAdminDashboard onNavigate={setActiveNav} />
          case 'coach':
            return <CoachDashboard onNavigate={setActiveNav} />
          case 'client':
            return <ClientDashboard onNavigate={setActiveNav} />
          case 'super_admin':
            return <SuperAdminDashboard onNavigate={setActiveNav} />
          default:
            return <GymAdminDashboard onNavigate={setActiveNav} />
        }

      case 'assignments':
      case 'clients':
        return <AssignmentsView />

      case 'dev':
        return <DevToolsView />

      case 'workouts':
        return <TrainingPlansView />

      case 'schedule':
        return <SessionsView />

      case 'progress':
        return <ProgressView />

      case 'videos':
        return (
          <FeaturePlaceholder
            title="Exercise Video Library"
            description="Browse HD form tutorials, movement technique demonstrations, and coach-uploaded video instructions."
            icon={<PlaySquare className="h-8 w-8" />}
          />
        )

      case 'reports':
        return (
          <FeaturePlaceholder
            title="Gym Analytics & Reports"
            description="Comprehensive gym revenue, coach utilization rates, membership retention, and attendance reports."
            icon={<BarChart3 className="h-8 w-8" />}
          />
        )

      case 'settings':
        return (
          <FeaturePlaceholder
            title="Gym Settings & Configuration"
            description="Manage facility details, branding, business hours, equipment categories, and membership plans."
            icon={<Settings className="h-8 w-8" />}
          />
        )

      case 'profile':
        return (
          <FeaturePlaceholder
            title="User Profile & Settings"
            description="Update personal contact info, change password, manage notification preferences, and view account activity."
            icon={<UserIcon className="h-8 w-8" />}
          />
        )

      case 'gyms':
        return (
          <FeaturePlaceholder
            title="Gyms & Tenants Management"
            description="Multi-tenant gym provisioning, domain configuration, and facility administration."
            icon={<Building2 className="h-8 w-8" />}
          />
        )

      case 'users':
        return (
          <FeaturePlaceholder
            title="Global User Directory"
            description="Platform-wide user management, role reassignment, and account status controls."
            icon={<Users className="h-8 w-8" />}
          />
        )

      default:
        return <AssignmentsView />
    }
  }

  return (
    <AppShell activeNav={activeNav} onSelectNav={setActiveNav}>
      {renderContent()}
    </AppShell>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  )
}
