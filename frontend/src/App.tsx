import { useState, useEffect, useCallback } from 'react'
import {
  Activity,
  Database,
  Server,
  Layers,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  Terminal,
  Cpu,
  Radio
} from 'lucide-react'

interface HealthData {
  status: string
  project: string
  environment: string
  database: {
    status: string
    latency_ms: number | null
    error: string | null
  }
}

export default function App() {
  const [health, setHealth] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [lastChecked, setLastChecked] = useState<string>('')
  const [apiError, setApiError] = useState<string | null>(null)

  const checkHealth = useCallback(async () => {
    setLoading(true)
    setApiError(null)
    try {
      // Direct call via Vite proxy to backend /api/v1/health
      const res = await fetch('/api/v1/health')
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`)
      }
      const data: HealthData = await res.json()
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Cpu className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-xl tracking-tight text-white">FitSphere</h1>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Dev Environment
                </span>
              </div>
              <p className="text-xs text-slate-400">Local Development Stack</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={checkHealth}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
              Check Status
            </button>
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition"
            >
              Swagger Docs
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8 flex-1 w-full space-y-8">
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
                React 19 (Vite) &bull; FastAPI 0.115+ &bull; PostgreSQL 16 &bull; Docker Compose
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
          {/* Card 1: Frontend */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5 hover:border-slate-700 transition">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Activity className="h-5 w-5" />
              </div>
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="h-3 w-3" /> Running
              </span>
            </div>
            <h3 className="font-semibold text-slate-200">Frontend (Vite)</h3>
            <p className="text-xs text-slate-400 mt-1 font-mono">http://localhost:5173</p>
            <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
              <span>Framework</span>
              <span className="font-medium text-slate-300">React 19 + TS + Tailwind</span>
            </div>
          </div>

          {/* Card 2: Backend */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5 hover:border-slate-700 transition">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Server className="h-5 w-5" />
              </div>
              {isBackendUp ? (
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3" /> Connected
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-medium text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                  <XCircle className="h-3 w-3" /> Offline
                </span>
              )}
            </div>
            <h3 className="font-semibold text-slate-200">FastAPI Backend</h3>
            <p className="text-xs text-slate-400 mt-1 font-mono">http://localhost:8000</p>
            <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
              <span>Status</span>
              <span className="font-medium text-slate-300">
                {isBackendUp ? `${health?.environment}` : 'Start Uvicorn server'}
              </span>
            </div>
          </div>

          {/* Card 3: PostgreSQL */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5 hover:border-slate-700 transition">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Database className="h-5 w-5" />
              </div>
              {isDbUp ? (
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3" /> Connected
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  <XCircle className="h-3 w-3" /> Awaiting Docker
                </span>
              )}
            </div>
            <h3 className="font-semibold text-slate-200">PostgreSQL</h3>
            <p className="text-xs text-slate-400 mt-1 font-mono">localhost:5432</p>
            <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
              <span>Latency</span>
              <span className="font-medium text-slate-300">
                {health?.database?.latency_ms !== undefined && health.database.latency_ms !== null
                  ? `${health.database.latency_ms} ms`
                  : 'N/A'}
              </span>
            </div>
          </div>

          {/* Card 4: Redis & RabbitMQ */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5 hover:border-slate-700 transition">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Layers className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                Docker Ready
              </span>
            </div>
            <h3 className="font-semibold text-slate-200">Redis & RabbitMQ</h3>
            <p className="text-xs text-slate-400 mt-1 font-mono">Ports: 6379 / 5672</p>
            <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
              <span>RabbitMQ UI</span>
              <a
                href="http://localhost:15672"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-indigo-400 hover:underline flex items-center gap-1"
              >
                :15672 <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </section>

        {/* Quick Start Guide / Command Reference */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Terminal className="h-5 w-5 text-indigo-400" />
            <h3 className="font-bold text-lg text-white">Local Developer Commands</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950/70 rounded-xl p-4 border border-slate-800/80">
              <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
                1. Start Docker Containers
              </div>
              <p className="text-xs text-slate-400 mb-2">Spins up PostgreSQL, Redis, and RabbitMQ:</p>
              <div className="font-mono text-xs bg-slate-900 rounded-lg p-2.5 text-slate-300 border border-slate-800 flex items-center justify-between">
                <span>docker compose up -d</span>
              </div>
            </div>

            <div className="bg-slate-950/70 rounded-xl p-4 border border-slate-800/80">
              <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
                2. Run FastAPI Backend
              </div>
              <p className="text-xs text-slate-400 mb-2">Start the API server with live hot reload:</p>
              <div className="font-mono text-xs bg-slate-900 rounded-lg p-2.5 text-slate-300 border border-slate-800 flex items-center justify-between">
                <span>source backend/.venv/bin/activate && uvicorn app.main:app --reload</span>
              </div>
            </div>

            <div className="bg-slate-950/70 rounded-xl p-4 border border-slate-800/80">
              <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
                3. Run Frontend Server
              </div>
              <p className="text-xs text-slate-400 mb-2">Start Vite dev server with Tailwind CSS:</p>
              <div className="font-mono text-xs bg-slate-900 rounded-lg p-2.5 text-slate-300 border border-slate-800 flex items-center justify-between">
                <span>cd frontend && npm run dev</span>
              </div>
            </div>

            <div className="bg-slate-950/70 rounded-xl p-4 border border-slate-800/80">
              <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
                4. Database Migrations (Alembic)
              </div>
              <p className="text-xs text-slate-400 mb-2">Generate and apply migrations:</p>
              <div className="font-mono text-xs bg-slate-900 rounded-lg p-2.5 text-slate-300 border border-slate-800 flex items-center justify-between">
                <span>alembic revision --autogenerate -m "create table"</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-4 px-6 text-center text-xs text-slate-500">
        FitSphere Local Development Environment &bull; Clean Architecture &bull; Ready for Feature Development
      </footer>
    </div>
  )
}
