import React, { useState, useEffect, useCallback } from 'react'
import {
  TrendingUp,
  Award,
  Dumbbell,
  AlertCircle,
  RefreshCw,
  Scale,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { reportApi } from '../../services/reportApi'
import type {
  ReportPeriodType,
  ClientOverviewReport,
  ClientProgressReport,
  ClientTrainingReport,
} from '../../types/report'
import { ReportPeriodFilter } from './ReportPeriodFilter'
import { SessionStatisticsCard } from './SessionStatisticsCard'
import { ProgressMetricCard } from './ProgressMetricCard'
import { SimpleTrendChart } from './SimpleTrendChart'
import { EmptyReportState } from './EmptyReportState'
import { ReportLoadingState } from './ReportLoadingState'

export const ClientReportsView: React.FC = () => {
  const { token } = useAuth()
  const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'training'>('overview')

  // Data states
  const [overview, setOverview] = useState<ClientOverviewReport | null>(null)
  const [progress, setProgress] = useState<ClientProgressReport | null>(null)
  const [training, setTraining] = useState<ClientTrainingReport | null>(null)

  // Filter states
  const [period, setPeriod] = useState<ReportPeriodType>('all_time')
  const [startDate, setStartDate] = useState<string | undefined>()
  const [endDate, setEndDate] = useState<string | undefined>()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadReport = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      if (activeTab === 'overview') {
        const data = await reportApi.getClientOverview(undefined, token)
        setOverview(data)
      } else if (activeTab === 'progress') {
        const data = await reportApi.getClientProgress(
          { period, startDate, endDate },
          token
        )
        setProgress(data)
      } else if (activeTab === 'training') {
        const data = await reportApi.getClientTraining(
          { period, startDate, endDate },
          token
        )
        setTraining(data)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load report data')
    } finally {
      setLoading(false)
    }
  }, [token, activeTab, period, startDate, endDate])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  const handlePeriodChange = (
    newPeriod: ReportPeriodType,
    newStart?: string,
    newEnd?: string
  ) => {
    setPeriod(newPeriod)
    setStartDate(newStart)
    setEndDate(newEnd)
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-indigo-900/40 via-slate-900 to-slate-900 p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <TrendingUp className="h-3.5 w-3.5" />
            Personal Fitness Analytics
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            My Fitness Reports & Analytics
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
            Track your training plan consistency, body measurement progress, and workout attendance milestones over time.
          </p>
        </div>

        <button
          onClick={loadReport}
          title="Refresh Report Data"
          className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white hover:border-slate-700 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-xs font-bold transition-colors cursor-pointer relative ${
            activeTab === 'overview'
              ? 'text-indigo-400 border-b-2 border-indigo-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Overview Summary
        </button>
        <button
          onClick={() => setActiveTab('progress')}
          className={`pb-3 text-xs font-bold transition-colors cursor-pointer relative ${
            activeTab === 'progress'
              ? 'text-indigo-400 border-b-2 border-indigo-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Body Progress & Measurements
        </button>
        <button
          onClick={() => setActiveTab('training')}
          className={`pb-3 text-xs font-bold transition-colors cursor-pointer relative ${
            activeTab === 'training'
              ? 'text-indigo-400 border-b-2 border-indigo-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Training Sessions & Attendance
        </button>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <ReportLoadingState />
      ) : (
        <>
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && overview && (
            <div className="space-y-6">
              {/* Highlight Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Coach Card */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow space-y-2">
                  <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                    <Award className="h-4 w-4" /> Personal Trainer
                  </div>
                  <div className="text-base font-bold text-white">
                    {overview.assigned_coach?.full_name || 'No coach assigned'}
                  </div>
                  <p className="text-xs text-slate-400">
                    {overview.assigned_coach?.email || 'Contact gym admin to get paired with a coach'}
                  </p>
                </div>

                {/* Training Plan Card */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                    <Dumbbell className="h-4 w-4" /> Active Training Plan
                  </div>
                  <div className="text-base font-bold text-white">
                    {overview.active_training_plan?.name || 'No active plan'}
                  </div>
                  <p className="text-xs text-slate-400">
                    Status:{' '}
                    <span className="capitalize font-medium text-slate-300">
                      {overview.active_training_plan?.status || 'None'}
                    </span>
                  </p>
                </div>

                {/* Check-ins count card */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow space-y-2 sm:col-span-2 lg:col-span-1">
                  <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider">
                    <Scale className="h-4 w-4" /> Progress Check-ins
                  </div>
                  <div className="text-xl font-extrabold text-white">
                    {overview.total_progress_records} Logged
                  </div>
                  <p className="text-xs text-slate-400">
                    {overview.latest_progress?.recorded_at
                      ? `Last logged: ${new Date(overview.latest_progress.recorded_at).toLocaleDateString()}`
                      : 'No progress records logged yet'}
                  </p>
                </div>
              </div>

              {/* Session Performance Card */}
              <SessionStatisticsCard
                stats={overview.session_stats}
                title="Training Attendance & Consistency"
                subtitle="Your total scheduled sessions and attendance completion rate"
              />
            </div>
          )}

          {/* TAB 2: PROGRESS */}
          {activeTab === 'progress' && progress && (
            <div className="space-y-6">
              {/* Period Filter Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Measurement Trends</h3>
                  <p className="text-xs text-slate-400">Filter by timeframe to view body composition deltas</p>
                </div>
                <ReportPeriodFilter
                  period={period}
                  startDate={startDate}
                  endDate={endDate}
                  onChange={handlePeriodChange}
                />
              </div>

              {progress.total_records === 0 ? (
                <EmptyReportState
                  title="No Progress Measurements In Period"
                  message="No check-ins were recorded within the selected period. Switch to 'All Time' or ask your coach to log a progress update."
                />
              ) : (
                <>
                  {/* Metric Delta Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <ProgressMetricCard
                      title="Body Weight"
                      metric={progress.weight}
                      unit="kg"
                      invertColors={true}
                    />
                    <ProgressMetricCard
                      title="Body Fat"
                      metric={progress.body_fat_percentage}
                      unit="%"
                      invertColors={true}
                    />
                    <ProgressMetricCard
                      title="Waist"
                      metric={progress.waist_cm}
                      unit="cm"
                      invertColors={true}
                    />
                    <ProgressMetricCard
                      title="Chest"
                      metric={progress.chest_cm}
                      unit="cm"
                      invertColors={false}
                    />
                    <ProgressMetricCard
                      title="Hips"
                      metric={progress.hip_cm}
                      unit="cm"
                      invertColors={true}
                    />
                    <ProgressMetricCard
                      title="Arm"
                      metric={progress.arm_cm}
                      unit="cm"
                      invertColors={false}
                    />
                    <ProgressMetricCard
                      title="Thigh"
                      metric={progress.thigh_cm}
                      unit="cm"
                      invertColors={false}
                    />
                  </div>

                  {/* Trend Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
                    <SimpleTrendChart
                      title="Body Weight Trend (kg)"
                      data={progress.history
                        .filter((h) => h.weight_kg !== null && h.weight_kg !== undefined)
                        .map((h) => ({
                          label: new Date(h.recorded_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          }),
                          value: Number(h.weight_kg),
                        }))}
                      color="#6366f1"
                      unit="kg"
                      emptyMessage="Need at least one weight entry to plot trend"
                    />

                    <SimpleTrendChart
                      title="Body Fat Percentage (%)"
                      data={progress.history
                        .filter((h) => h.body_fat_percentage !== null && h.body_fat_percentage !== undefined)
                        .map((h) => ({
                          label: new Date(h.recorded_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          }),
                          value: Number(h.body_fat_percentage),
                        }))}
                      color="#10b981"
                      unit="%"
                      emptyMessage="Need at least one body fat entry to plot trend"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 3: TRAINING */}
          {activeTab === 'training' && training && (
            <div className="space-y-6">
              {/* Period Filter Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Workout Session Analytics</h3>
                  <p className="text-xs text-slate-400">Review your attendance, cancellations, and consistency</p>
                </div>
                <ReportPeriodFilter
                  period={period}
                  startDate={startDate}
                  endDate={endDate}
                  onChange={handlePeriodChange}
                />
              </div>

              <SessionStatisticsCard stats={training.session_stats} />

              {/* Sessions Over Time Chart */}
              {training.activity_by_date.length > 0 ? (
                <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Session Activity by Date
                  </h4>
                  <SimpleTrendChart
                    data={training.activity_by_date.map((d) => ({
                      label: d.date,
                      value: d.completed,
                    }))}
                    color="#10b981"
                    unit="completed sessions"
                    height={160}
                  />
                </div>
              ) : (
                <EmptyReportState
                  title="No Session Activity"
                  message="No training sessions occurred within this timeframe."
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
