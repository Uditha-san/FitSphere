import React, { useState, useEffect, useCallback } from 'react'
import { Terminal, Activity, RefreshCw, Server, Database, Layers, Radio, ExternalLink } from 'lucide-react'
import type { HealthResponse } from '../../types/api'
import { apiService } from '../../services/api'
import ServiceStatusCard from '../dashboard/components/ServiceStatusCard'
import CommandCheatSheet from '../dashboard/components/CommandCheatSheet'
import RoleSwitcherBar from '../assignments/components/RoleSwitcherBar'

export const DevToolsView: React.FC = () => {
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

  const isBackendUp = health !== null && !apiError
  const isDbUp = health?.database?.status === 'connected'

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Terminal className="h-3.5 w-3.5" />
            Isolated Development Zone
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Developer Tools & Diagnostics</h2>
          <p className="text-xs text-slate-400 mt-1">
            Infrastructure diagnostics, live service metrics, and rapid local role switcher.
          </p>
        </div>

        <button
          onClick={checkHealth}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          Run Health Diagnostics
        </button>
      </div>

      {/* Role Switcher in Dev Mode */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Authentication & Role Simulation
        </div>
        <RoleSwitcherBar />
      </div>

      {/* Environment Overview Banner */}
      <section className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-900/40 p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Radio className="h-3.5 w-3.5 animate-pulse" />
              Runtime Status
            </div>
            <h3 className="text-xl font-bold text-white">System Health & Architecture</h3>
            <p className="text-xs text-slate-400 mt-1">
              Modular Monolith Foundation &bull; FastAPI 0.115+ &bull; PostgreSQL 16 &bull; React 19
            </p>
          </div>
          <div className="flex items-center gap-4 bg-slate-950/60 border border-slate-800/80 rounded-xl px-4 py-2.5 text-xs">
            <div>
              <div className="text-slate-400">Stack Status</div>
              <div className="font-semibold text-emerald-400">
                {isBackendUp && isDbUp ? 'Operational' : 'Degraded'}
              </div>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div>
              <div className="text-slate-400">Checked</div>
              <div className="font-mono text-slate-300">{lastChecked || 'Pending...'}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Service Status Cards Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ServiceStatusCard
          title="Frontend (Vite)"
          subtitle="http://localhost:5173"
          icon={<Activity className="h-5 w-5 text-cyan-400" />}
          status="running"
          statusLabel="Running"
          footerKey="Framework"
          footerValue="React 19 + TS + Tailwind"
        />

        <ServiceStatusCard
          title="FastAPI Backend"
          subtitle="http://localhost:8000"
          icon={<Server className="h-5 w-5 text-indigo-400" />}
          status={isBackendUp ? 'connected' : 'offline'}
          footerKey="Environment"
          footerValue={isBackendUp ? health?.environment : 'Offline'}
        />

        <ServiceStatusCard
          title="PostgreSQL"
          subtitle="localhost:5432"
          icon={<Database className="h-5 w-5 text-blue-400" />}
          status={isDbUp ? 'connected' : 'pending'}
          statusLabel={isDbUp ? 'Connected' : 'Awaiting Docker'}
          footerKey="Latency"
          footerValue={
            health?.database?.latency_ms !== undefined && health.database.latency_ms !== null
              ? `${health.database.latency_ms} ms`
              : 'N/A'
          }
        />

        <ServiceStatusCard
          title="Redis & RabbitMQ"
          subtitle="Ports: 6379 / 5672"
          icon={<Layers className="h-5 w-5 text-amber-400" />}
          status="running"
          statusLabel="Docker Ready"
          footerKey="RabbitMQ UI"
          footerValue={
            <a
              href="http://localhost:15672"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-indigo-400 hover:underline flex items-center gap-1"
            >
              :15672 <ExternalLink className="h-3 w-3" />
            </a>
          }
        />
      </section>

      {/* Command Cheat Sheet */}
      <CommandCheatSheet />
    </div>
  )
}

export default DevToolsView
