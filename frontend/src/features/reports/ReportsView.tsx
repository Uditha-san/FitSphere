import React from 'react'
import { useAuth } from '../../context/AuthContext'
import { ClientReportsView } from './ClientReportsView'
import { CoachReportsView } from './CoachReportsView'
import { GymAdminReportsView } from './GymAdminReportsView'
import { SuperAdminReportsView } from './SuperAdminReportsView'

export const ReportsView: React.FC = () => {
  const { user } = useAuth()

  switch (user?.role) {
    case 'super_admin':
      return <SuperAdminReportsView />
    case 'gym_admin':
      return <GymAdminReportsView />
    case 'coach':
      return <CoachReportsView />
    case 'client':
    default:
      return <ClientReportsView />
  }
}

export default ReportsView
