import React, { useState, useEffect, useCallback } from 'react'
import {
  Users,
  Dumbbell,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  X,
  UserCheck,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { reportApi } from '../../services/reportApi'
import type {
  CoachOverviewReport,
  CoachClientSummary,
  ClientOverviewReport,
} from '../../types/report'
import { SessionStatisticsCard } from './SessionStatisticsCard'
import { ReportLoadingState } from './ReportLoadingState'
import { EmptyReportState } from './EmptyReportState'

export const CoachReportsView: React.FC = () => {
  const { token } = useAuth()
  const [overview, setOverview] = useState<CoachOverviewReport | null>(null)
  const [clients, setClients] = useState<CoachClientSummary[]>([])
  const [selectedClientReport, setSelectedClientReport] = useState<ClientOverviewReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [deepDiveLoading, setDeepDiveLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const [ovData, clientsData] = await Promise.all([
        reportApi.getCoachOverview(token),
        reportApi.getCoachClients({ skip: 0, limit: 50 }, token),
      ])
      setOverview(ovData)
      setClients(clientsData)
    } catch (err: any) {
      setError(err.message || 'Failed to load coach report data')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleOpenClientDeepDive = async (clientId: string) => {
    if (!token) return
    setDeepDiveLoading(true)
    try {
      const rep = await reportApi.getCoachClientDeepDive(clientId, token)
      setSelectedClientReport(rep)
    } catch (err: any) {
      alert(err.message || 'Failed to load athlete report')
    } finally {
      setDeepDiveLoading(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-indigo-900/40 via-slate-900 to-slate-900 p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <Users className="h-3.5 w-3.5" />
            Coach Analytics
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Coach Performance & Roster Reports
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
            Monitor client training plan adherence, attendance metrics, and individual progress updates across your athlete roster.
          </p>
        </div>

        <button
          onClick={loadData}
          title="Refresh Coach Data"
          className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white hover:border-slate-700 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <ReportLoadingState />
      ) : (
        <>
          {overview && (
            <div className="space-y-6">
              {/* Summary Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Total Athletes
                  </span>
                  <div className="text-2xl font-extrabold text-white">{overview.total_assigned_clients}</div>
                  <p className="text-xs text-slate-400">{overview.active_assigned_clients} active pairings</p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Training Plans
                  </span>
                  <div className="text-2xl font-extrabold text-emerald-400">
                    {overview.active_training_plans}
                  </div>
                  <p className="text-xs text-slate-400">{overview.total_training_plans} total created</p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Completed Sessions
                  </span>
                  <div className="text-2xl font-extrabold text-indigo-400">
                    {overview.session_stats.completed}
                  </div>
                  <p className="text-xs text-slate-400">{overview.session_stats.total} total sessions</p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Completion Rate
                  </span>
                  <div className="text-2xl font-extrabold text-white">
                    {overview.session_stats.completion_rate}%
                  </div>
                  <p className="text-xs text-slate-400">Attendance adherence</p>
                </div>
              </div>

              {/* Session Statistics Card */}
              <SessionStatisticsCard
                stats={overview.session_stats}
                title="Roster Training Sessions Breakdown"
                subtitle="Attendance breakdown across all your athlete bookings"
              />

              {/* Assigned Athletes Table */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-indigo-400" />
                      Assigned Athletes Summary ({clients.length})
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Progress and session status for all athletes assigned to you
                    </p>
                  </div>
                </div>

                {clients.length === 0 ? (
                  <EmptyReportState
                    title="No Athletes Assigned"
                    message="You do not currently have any clients assigned. Contact your gym administrator to pair athletes."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950/60 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="px-4 py-3">Athlete</th>
                          <th className="px-4 py-3">Training Plan</th>
                          <th className="px-4 py-3">Sessions (Done / Next)</th>
                          <th className="px-4 py-3">Latest Check-in</th>
                          <th className="px-4 py-3">Weight</th>
                          <th className="px-4 py-3">Body Fat</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {clients.map((c) => (
                          <tr key={c.client_id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="px-4 py-3.5">
                              <div className="font-bold text-white">{c.client_name || 'Unnamed Athlete'}</div>
                              <div className="text-[11px] text-slate-400">{c.email}</div>
                            </td>
                            <td className="px-4 py-3.5">
                              {c.active_plan_name ? (
                                <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                                  <Dumbbell className="h-3 w-3" /> {c.active_plan_name}
                                </span>
                              ) : (
                                <span className="text-slate-600 italic">None</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="font-semibold text-white">
                                <span className="text-emerald-400">{c.sessions_completed} done</span> /{' '}
                                <span className="text-indigo-400">{c.sessions_upcoming} upcoming</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              {c.last_progress_date ? (
                                <span className="text-slate-300 font-medium">
                                  {new Date(c.last_progress_date).toLocaleDateString()}
                                </span>
                              ) : (
                                <span className="text-slate-600 italic">Never</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 font-semibold text-white">
                              {c.latest_weight_kg ? `${c.latest_weight_kg} kg` : <span className="text-slate-600">—</span>}
                            </td>
                            <td className="px-4 py-3.5 font-semibold text-white">
                              {c.latest_body_fat_percentage ? `${c.latest_body_fat_percentage}%` : <span className="text-slate-600">—</span>}
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <button
                                onClick={() => handleOpenClientDeepDive(c.client_id)}
                                disabled={deepDiveLoading}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-colors cursor-pointer"
                              >
                                {deepDiveLoading ? 'Loading...' : 'View Report'} <ChevronRight className="h-3 w-3" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Athlete Deep Dive Modal */}
      {selectedClientReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                  Athlete Deep-Dive Report
                </span>
                <h3 className="text-xl font-bold text-white mt-0.5">
                  {selectedClientReport.client_name || 'Athlete Report'}
                </h3>
                <p className="text-xs text-slate-400">{selectedClientReport.client_email}</p>
              </div>
              <button
                onClick={() => setSelectedClientReport(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Plan and checkin summary */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-950/50 border border-slate-800 text-xs">
              <div>
                <div className="text-[10px] uppercase font-semibold text-slate-500">Active Plan</div>
                <div className="font-semibold text-white mt-0.5">
                  {selectedClientReport.active_training_plan?.name || 'No active plan'}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-semibold text-slate-500">Total Check-ins</div>
                <div className="font-semibold text-white mt-0.5">
                  {selectedClientReport.total_progress_records} logged
                </div>
              </div>
            </div>

            {/* Session Stats */}
            <SessionStatisticsCard stats={selectedClientReport.session_stats} />
          </div>
        </div>
      )}
    </div>
  )
}
