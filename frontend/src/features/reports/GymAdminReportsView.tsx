import React, { useState, useEffect, useCallback } from 'react'
import {
  Building2,
  Users,
  Dumbbell,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { reportApi } from '../../services/reportApi'
import type {
  ReportPeriodType,
  GymOverviewReport,
  GymClientSummary,
  GymCoachSummary,
  GymSessionReport,
} from '../../types/report'
import { SessionStatisticsCard } from './SessionStatisticsCard'
import { SimpleTrendChart } from './SimpleTrendChart'
import { ReportPeriodFilter } from './ReportPeriodFilter'
import { ReportLoadingState } from './ReportLoadingState'
import { EmptyReportState } from './EmptyReportState'

export const GymAdminReportsView: React.FC = () => {
  const { token } = useAuth()
  const [activeTab, setActiveTab] = useState<'overview' | 'clients' | 'coaches' | 'sessions'>('overview')

  const [overview, setOverview] = useState<GymOverviewReport | null>(null)
  const [clients, setClients] = useState<GymClientSummary[]>([])
  const [coaches, setCoaches] = useState<GymCoachSummary[]>([])
  const [sessionsReport, setSessionsReport] = useState<GymSessionReport | null>(null)

  // Period filter for sessions tab
  const [period, setPeriod] = useState<ReportPeriodType>('all_time')
  const [startDate, setStartDate] = useState<string | undefined>()
  const [endDate, setEndDate] = useState<string | undefined>()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      if (activeTab === 'overview') {
        const ov = await reportApi.getGymOverview({}, token)
        setOverview(ov)
      } else if (activeTab === 'clients') {
        const cl = await reportApi.getGymClients({ skip: 0, limit: 50 }, token)
        setClients(cl)
      } else if (activeTab === 'coaches') {
        const co = await reportApi.getGymCoaches({ skip: 0, limit: 50 }, token)
        setCoaches(co)
      } else if (activeTab === 'sessions') {
        const sess = await reportApi.getGymSessions({ period, startDate, endDate }, token)
        setSessionsReport(sess)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load gym analytics')
    } finally {
      setLoading(false)
    }
  }, [token, activeTab, period, startDate, endDate])

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-blue-900/40 via-slate-900 to-slate-900 p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider">
            <Building2 className="h-3.5 w-3.5" />
            Facility Intelligence
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Gym Reports & Operations Analytics
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
            Audit member retention, coach roster workloads, workout plan assignments, and session attendance metrics.
          </p>
        </div>

        <button
          onClick={loadData}
          title="Refresh Facility Analytics"
          className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white hover:border-slate-700 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-xs font-bold transition-colors cursor-pointer shrink-0 ${
            activeTab === 'overview'
              ? 'text-blue-400 border-b-2 border-blue-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Gym Overview
        </button>
        <button
          onClick={() => setActiveTab('clients')}
          className={`pb-3 text-xs font-bold transition-colors cursor-pointer shrink-0 ${
            activeTab === 'clients'
              ? 'text-blue-400 border-b-2 border-blue-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Client Activity Table
        </button>
        <button
          onClick={() => setActiveTab('coaches')}
          className={`pb-3 text-xs font-bold transition-colors cursor-pointer shrink-0 ${
            activeTab === 'coaches'
              ? 'text-blue-400 border-b-2 border-blue-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Coach Performance Table
        </button>
        <button
          onClick={() => setActiveTab('sessions')}
          className={`pb-3 text-xs font-bold transition-colors cursor-pointer shrink-0 ${
            activeTab === 'sessions'
              ? 'text-blue-400 border-b-2 border-blue-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Session Analytics & Timeline
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
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && overview && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Members</span>
                  <div className="text-2xl font-extrabold text-white">{overview.total_clients}</div>
                  <p className="text-xs text-slate-400">{overview.active_assignments} active pairings</p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Coaches Staff</span>
                  <div className="text-2xl font-extrabold text-blue-400">{overview.total_coaches}</div>
                  <p className="text-xs text-slate-400">Certified personal trainers</p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Training Plans</span>
                  <div className="text-2xl font-extrabold text-emerald-400">{overview.active_training_plans}</div>
                  <p className="text-xs text-slate-400">{overview.total_training_plans} total regimens</p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Progress Logs</span>
                  <div className="text-2xl font-extrabold text-white">{overview.total_progress_records}</div>
                  <p className="text-xs text-slate-400">Check-in evaluations</p>
                </div>
              </div>

              <SessionStatisticsCard
                stats={overview.session_stats}
                title="Facility Training Attendance"
                subtitle="Aggregated session completion rate across all coaches and athletes in your facility"
              />
            </div>
          )}

          {/* TAB 2: CLIENTS TABLE */}
          {activeTab === 'clients' && (
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-4">
              <div className="border-b border-slate-800/80 pb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-400" />
                  Facility Members & Activity ({clients.length})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Overview of all registered gym clients, coaching assignments, and session participation
                </p>
              </div>

              {clients.length === 0 ? (
                <EmptyReportState title="No Registered Clients" message="No clients are currently registered under this gym." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/60 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Member</th>
                        <th className="px-4 py-3">Assigned Coach</th>
                        <th className="px-4 py-3">Training Plan</th>
                        <th className="px-4 py-3">Total Sessions</th>
                        <th className="px-4 py-3">Completed</th>
                        <th className="px-4 py-3">Upcoming</th>
                        <th className="px-4 py-3">Last Check-in</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {clients.map((c) => (
                        <tr key={c.client_id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-white">{c.client_name || 'Member'}</div>
                            <div className="text-[11px] text-slate-400">{c.email}</div>
                          </td>
                          <td className="px-4 py-3.5 font-medium text-slate-200">
                            {c.assigned_coach_name ? (
                              <span className="text-indigo-400">{c.assigned_coach_name}</span>
                            ) : (
                              <span className="text-slate-600 italic">Unassigned</span>
                            )}
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
                          <td className="px-4 py-3.5 font-semibold text-white">{c.total_sessions}</td>
                          <td className="px-4 py-3.5 font-semibold text-emerald-400">{c.completed_sessions}</td>
                          <td className="px-4 py-3.5 font-semibold text-indigo-400">{c.upcoming_sessions}</td>
                          <td className="px-4 py-3.5 text-slate-400">
                            {c.latest_progress_date
                              ? new Date(c.latest_progress_date).toLocaleDateString()
                              : 'Never'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: COACHES TABLE */}
          {activeTab === 'coaches' && (
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-4">
              <div className="border-b border-slate-800/80 pb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-400" />
                  Coaches Workload & Attendance Performance ({coaches.length})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Active roster sizes, plan count, and session completion rates per certified coach
                </p>
              </div>

              {coaches.length === 0 ? (
                <EmptyReportState title="No Coaches Found" message="No coaches are currently registered under this facility." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/60 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Coach</th>
                        <th className="px-4 py-3">Assigned Athletes</th>
                        <th className="px-4 py-3">Active Plans</th>
                        <th className="px-4 py-3">Total Sessions</th>
                        <th className="px-4 py-3">Completed</th>
                        <th className="px-4 py-3">Upcoming</th>
                        <th className="px-4 py-3">Completion Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {coaches.map((c) => (
                        <tr key={c.coach_id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-white">{c.coach_name || 'Coach'}</div>
                            <div className="text-[11px] text-slate-400">{c.email}</div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-bold text-white">{c.active_clients_count}</span>
                            <span className="text-[11px] text-slate-400"> ({c.assigned_clients_count} total)</span>
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-emerald-400">{c.training_plans_count}</td>
                          <td className="px-4 py-3.5 font-semibold text-white">{c.total_sessions}</td>
                          <td className="px-4 py-3.5 font-semibold text-emerald-400">{c.completed_sessions}</td>
                          <td className="px-4 py-3.5 font-semibold text-indigo-400">{c.upcoming_sessions}</td>
                          <td className="px-4 py-3.5">
                            <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-extrabold bg-blue-500/10 border border-blue-500/20 text-blue-400">
                              {c.completion_rate}%
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SESSIONS & TIMELINE */}
          {activeTab === 'sessions' && sessionsReport && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Facility Sessions Report</h3>
                  <p className="text-xs text-slate-400">Filter scheduled session outcomes by timeframe</p>
                </div>
                <ReportPeriodFilter
                  period={period}
                  startDate={startDate}
                  endDate={endDate}
                  onChange={(p, s, e) => {
                    setPeriod(p)
                    setStartDate(s)
                    setEndDate(e)
                  }}
                />
              </div>

              <SessionStatisticsCard stats={sessionsReport.session_stats} />

              {sessionsReport.activity_by_date.length > 0 ? (
                <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Daily Attendance Volume
                  </h4>
                  <SimpleTrendChart
                    data={sessionsReport.activity_by_date.map((d) => ({
                      label: d.date,
                      value: d.completed,
                    }))}
                    color="#3b82f6"
                    unit="completed"
                    height={180}
                  />
                </div>
              ) : (
                <EmptyReportState
                  title="No Session Activity"
                  message="No sessions were scheduled in the selected timeframe."
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
