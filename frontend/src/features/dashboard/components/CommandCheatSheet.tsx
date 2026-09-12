import React from 'react'
import { Terminal } from 'lucide-react'

interface CommandItem {
  step: string
  description: string
  command: string
}

const COMMANDS: CommandItem[] = [
  {
    step: '1. Start Docker Containers',
    description: 'Spins up PostgreSQL and Redis in the background:',
    command: 'docker compose up -d',
  },
  {
    step: '2. Run FastAPI Backend',
    description: 'Start the API server with live hot reload:',
    command: 'source backend/.venv/bin/activate && uvicorn app.main:app --reload',
  },
  {
    step: '3. Run Frontend Server',
    description: 'Start Vite dev server with Tailwind CSS:',
    command: 'cd frontend && npm run dev',
  },
  {
    step: '4. Database Migrations (Alembic)',
    description: 'Generate and apply migrations:',
    command: 'alembic revision --autogenerate -m "create table"',
  },
]

export const CommandCheatSheet: React.FC = () => {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Terminal className="h-5 w-5 text-indigo-400" />
        <h3 className="font-bold text-lg text-white">Local Developer Commands</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {COMMANDS.map((item) => (
          <div key={item.step} className="bg-slate-950/70 rounded-xl p-4 border border-slate-800/80">
            <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
              {item.step}
            </div>
            <p className="text-xs text-slate-400 mb-2">{item.description}</p>
            <div className="font-mono text-xs bg-slate-900 rounded-lg p-2.5 text-slate-300 border border-slate-800 flex items-center justify-between">
              <span>{item.command}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default CommandCheatSheet
