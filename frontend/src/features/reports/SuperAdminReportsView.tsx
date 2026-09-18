import React, { useState, useEffect, useCallback } from 'react'
import {
  ShieldCheck,
  Building2,
  Search,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  X,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { reportApi } from '../../services/reportApi'
import type {
  PlatformOverviewReport,
  TenantSummaryReport,
  GymOverviewReport,
} from '../../types/report'
import { SessionStatisticsCard } from './SessionStatisticsCard'
import { ReportLoadingState } from './ReportLoadingState'
import { EmptyReportState } from './EmptyReportState'

export const SuperAdminReportsView: React.FC = () => {
  const { token } = useAuth()
  const [overview, setOverview] = useState<PlatformOverviewReport | null>(null)
  const [tenants, setTenants] = useState<TenantSummaryReport[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGymReport, setSelectedGymReport] = useState<GymOverviewReport | null>(null)

  const [loading, setLoading] = useState(true)
  const [gymLoading, setGymLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const [ovData, tenantsData] = await Promise.all([
        reportApi.getPlatformOverview(token),
        reportApi.getTenantsReports({ search: searchQuery.trim() || undefined, limit: 100 }, token),
      ])
      setOverview(ovData)
      setTenants(tenantsData)
    } catch (err: any) {
      setError(err.message || 'Failed to load platform analytics')
    } finally {
      setLoading(false)
    }
  }, [token, searchQuery])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleInspectGym = async (tenantId: string) => {
    if (!token) return
    setGymLoading(true)
    try {
      const g = await reportApi.getSpecificGymReport(tenantId, token)
      setSelectedGymReport(g)
    } catch (err: any) {
      alert(err.message || 'Failed to fetch gym details')
    } finally {
      setGymLoading(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-purple-900/40 via-slate-900 to-slate-900 p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="h-3.5 w-3.5" />
            Platform-Wide Governance & BI
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Platform Reports & Tenant Analytics
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
            Audit system-wide SaaS adoption, tenant facility health, active memberships, and total coaching volume.
          </p>
        </div>

        <button
          onClick={loadData}
          title="Refresh Platform Intelligence"
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
        overview && (
          <div className="space-y-8">
            {/* Global Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900 shadow">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Gyms</span>
                <div className="text-2xl font-extrabold text-white mt-1">{overview.total_gyms}</div>
                <span className="text-[10px] text-slate-500">Active tenants</span>
              </div>

              <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900 shadow">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Users</span>
                <div className="text-2xl font-extrabold text-white mt-1">{overview.total_users}</div>
                <span className="text-[10px] text-slate-500">All accounts</span>
              </div>

              <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900 shadow">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Clients</span>
                <div className="text-2xl font-extrabold text-emerald-400 mt-1">{overview.total_clients}</div>
                <span className="text-[10px] text-slate-500">Registered members</span>
              </div>

              <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900 shadow">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Coaches</span>
                <div className="text-2xl font-extrabold text-blue-400 mt-1">{overview.total_coaches}</div>
                <span className="text-[10px] text-slate-500">Personal trainers</span>
              </div>

              <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900 shadow">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pairings</span>
                <div className="text-2xl font-extrabold text-indigo-400 mt-1">{overview.total_active_assignments}</div>
                <span className="text-[10px] text-slate-500">Active assignments</span>
              </div>

              <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900 shadow">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Exercises</span>
                <div className="text-2xl font-extrabold text-purple-400 mt-1">{overview.total_exercises}</div>
                <span className="text-[10px] text-slate-500">Movement library</span>
              </div>
            </div>

            {/* Platform Session Statistics */}
            <SessionStatisticsCard
              stats={overview.session_stats}
              title="Platform-Wide Training Activity"
              subtitle="Aggregated session metrics across all active gym facilities on FitSphere"
            />

            {/* Tenant Breakdown Table */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-purple-400" />
                    Tenant Facilities Audit ({tenants.length})
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Individual facility performance, member count, and training volume
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search gyms..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {tenants.length === 0 ? (
                <EmptyReportState title="No Gyms Found" message="No gym tenants match your search filter." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/60 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Facility</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Members (Clients / Coaches)</th>
                        <th className="px-4 py-3">Active Pairings</th>
                        <th className="px-4 py-3">Training Plans</th>
                        <th className="px-4 py-3">Sessions (Total / Done)</th>
                        <th className="px-4 py-3 text-right">Audit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {tenants.map((t) => (
                        <tr key={t.tenant_id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-white">{t.name}</div>
                            <div className="text-[11px] text-slate-400">slug: {t.slug}</div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                t.is_active
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              {t.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-bold text-white">{t.total_users} users</span>
                            <span className="text-[11px] text-slate-400">
                              {' '}
                              ({t.total_clients} clients, {t.total_coaches} coaches)
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-indigo-400">{t.active_assignments}</td>
                          <td className="px-4 py-3.5 font-semibold text-emerald-400">{t.total_training_plans}</td>
                          <td className="px-4 py-3.5 font-semibold text-white">
                            {t.total_sessions}{' '}
                            <span className="text-emerald-400 font-normal">({t.completed_sessions} completed)</span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <button
                              onClick={() => handleInspectGym(t.tenant_id)}
                              disabled={gymLoading}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-purple-400 hover:text-purple-300 disabled:opacity-50 transition-colors cursor-pointer"
                            >
                              {gymLoading ? 'Loading...' : 'Inspect'} <ChevronRight className="h-3 w-3" />
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
        )
      )}

      {/* Gym Audit Modal */}
      {selectedGymReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">
                  Gym Facility Audit
                </span>
                <h3 className="text-xl font-bold text-white mt-0.5">{selectedGymReport.tenant_name}</h3>
                <p className="text-xs text-slate-400">Tenant ID: {selectedGymReport.tenant_id}</p>
              </div>
              <button
                onClick={() => setSelectedGymReport(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800">
                <span className="text-[10px] font-bold uppercase text-slate-500">Clients</span>
                <div className="text-lg font-bold text-white mt-1">{selectedGymReport.total_clients}</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800">
                <span className="text-[10px] font-bold uppercase text-slate-500">Coaches</span>
                <div className="text-lg font-bold text-white mt-1">{selectedGymReport.total_coaches}</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800">
                <span className="text-[10px] font-bold uppercase text-slate-500">Pairings</span>
                <div className="text-lg font-bold text-indigo-400 mt-1">{selectedGymReport.active_assignments}</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800">
                <span className="text-[10px] font-bold uppercase text-slate-500">Plans</span>
                <div className="text-lg font-bold text-emerald-400 mt-1">
                  {selectedGymReport.active_training_plans}
                </div>
              </div>
            </div>

            <SessionStatisticsCard
              stats={selectedGymReport.session_stats}
              title="Tenant Sessions Breakdown"
              subtitle="Audit attendance and cancellation rates for this facility"
            />
          </div>
        </div>
      )}
    </div>
  )
}
