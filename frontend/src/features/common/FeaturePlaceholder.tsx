import React from 'react'
import { Clock, Layers } from 'lucide-react'

interface FeaturePlaceholderProps {
  title: string
  description: string
  icon: React.ReactNode
  statusText?: string
}

export const FeaturePlaceholder: React.FC<FeaturePlaceholderProps> = ({
  title,
  description,
  icon,
  statusText = 'Planned in Next Roadmap Phase',
}) => {
  return (
    <div className="max-w-4xl mx-auto py-10 space-y-8">
      {/* Hero Banner */}
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900/80 to-slate-950 p-8 sm:p-12 shadow-2xl relative overflow-hidden text-center">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-5 max-w-lg mx-auto">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shadow-xl shadow-indigo-500/10 mx-auto">
            {icon}
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
              <Clock className="h-3 w-3" />
              {statusText}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {title}
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              {description}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 text-left space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-300">
              <Layers className="h-4 w-4 text-indigo-400" />
              Full-Stack Architecture Standard
            </div>
            <p className="text-slate-400 text-[11px] leading-normal">
              FitSphere domains are built end-to-end across database models, Alembic migrations,
              service-layer RBAC authorization, and responsive frontend views without simulated or
              mock data.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FeaturePlaceholder
