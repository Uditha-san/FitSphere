import React from 'react'
import {
  Activity,
  Database,
  Server,
  Layers,
  Radio,
  ExternalLink
} from 'lucide-react'
import type { HealthResponse } from '../../types/api'
import ServiceStatusCard from './components/ServiceStatusCard'
import CommandCheatSheet from './components/CommandCheatSheet'

interface DevDashboardProps {
  health: HealthResponse | null
  lastChecked: string
  apiError: string | null
}

export const DevDashboard: React.FC<DevDashboardProps> = ({
  health,
  lastChecked,
  apiError,
}) => {
  const isBackendUp = health !== null && !apiError
  const isDbUp = health?.database?.status === 'connected'

  return (
    <div className="space-y-8">
      {/* Environment Overview Banner */}
      <section className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-900/40 p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Radio className="h-3.5 w-3.5 animate-pulse" />
              Local Runtime Status
            </div>
            <h2 className="text-2xl font-bold text-white">System Health & Architecture</h2>
            <p className="text-sm text-slate-400 mt-1">
              Modular Monolith Foundation &bull; FastAPI 0.115+ &bull; PostgreSQL 16 &bull; React 19
            </p>
          </div>
          <div className="flex items-center gap-4 bg-slate-950/60 border border-slate-800/80 rounded-xl px-4 py-2.5">
            <div className="text-right">
              <div className="text-xs text-slate-400">Stack Status</div>
              <div className="text-sm font-semibold flex items-center justify-end gap-1.5">
                {isBackendUp && isDbUp ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                    Operational
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" />
                    Pending Services
                  </span>
                )}
              </div>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div className="text-right">
              <div className="text-xs text-slate-400">Last Checked</div>
              <div className="text-xs font-mono text-slate-300">{lastChecked || 'Checking...'}</div>
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

      {/* Quick Start Guide / Command Reference */}
      <CommandCheatSheet />
    </div>
  )
}

export default DevDashboard
