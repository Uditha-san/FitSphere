import React, { useState, useEffect } from 'react'
import {
  Activity,
  LayoutGrid,
  List,
  Loader2,
  RefreshCw,
  AlertCircle,
  TrendingUp,
} from 'lucide-react'
import { progressApi } from '../../services/progressApi'
import { useAuth } from '../../context/AuthContext'
import type { ProgressRecord, ProgressLatestSummary } from '../../types/progress'
import ProgressSummaryCard from './ProgressSummaryCard'
import ProgressMeasurementsTable from './ProgressMeasurementsTable'
import ProgressRecordCard from './ProgressRecordCard'

export const ClientProgressView: React.FC = () => {
  const { token, user } = useAuth()
  const [records, setRecords] = useState<ProgressRecord[]>([])
  const [summary, setSummary] = useState<ProgressLatestSummary | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    if (!token || !user) return
    setLoading(true)
    setError(null)

    try {
      const [historyData, summaryData] = await Promise.all([
        progressApi.getClientHistory(user.id, {}, token),
        progressApi.getClientSummary(user.id, token),
      ])
      setRecords(historyData)
      setSummary(summaryData)
    } catch (err: any) {
      setError(err.message || 'Failed to load your progress records.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [token, user])

  return (
    <div className="space-y-6">
      {/* Top Bar: Title & View Options */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/40 p-5 rounded-2xl border border-slate-800 backdrop-blur-sm">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-400" />
            My Fitness & Body Progress
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Personal body composition history and measurement check-ins recorded by your coach
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950/60 p-1">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Table View"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === 'cards' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Cards View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          {/* Refresh */}
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <ProgressSummaryCard summary={summary} />

      {/* Main Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400 mb-3" />
          <p className="text-sm">Loading your progress history...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center text-slate-400">
          <Activity className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No Check-Ins Recorded Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Your coach has not logged any body metrics or check-in assessments yet. Once your coach completes an assessment, your weight trends and measurements will appear here.
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <ProgressMeasurementsTable
          records={records}
          showCoachColumn={true}
          canManage={false}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {records.map((rec) => (
            <ProgressRecordCard
              key={rec.id}
              record={rec}
              canManage={false}
              showClient={false}
              showCoach={true}
            />
          ))}
        </div>
      )}
    </div>
  )
}
export default ClientProgressView
