import React from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'

interface ServiceStatusCardProps {
  title: string
  subtitle: string
  icon: React.ReactNode
  status: 'running' | 'connected' | 'offline' | 'pending'
  statusLabel?: string
  footerKey: string
  footerValue: React.ReactNode
}

export const ServiceStatusCard: React.FC<ServiceStatusCardProps> = ({
  title,
  subtitle,
  icon,
  status,
  statusLabel,
  footerKey,
  footerValue,
}) => {
  const isHealthy = status === 'running' || status === 'connected'

  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5 hover:border-slate-700 transition">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/50">
          {icon}
        </div>
        {isHealthy ? (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" /> {statusLabel || (status === 'connected' ? 'Connected' : 'Running')}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs font-medium text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
            <XCircle className="h-3 w-3" /> {statusLabel || (status === 'pending' ? 'Pending' : 'Offline')}
          </span>
        )}
      </div>
      <h3 className="font-semibold text-slate-200">{title}</h3>
      <p className="text-xs text-slate-400 mt-1 font-mono">{subtitle}</p>
      <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
        <span>{footerKey}</span>
        <span className="font-medium text-slate-300">{footerValue}</span>
      </div>
    </div>
  )
}

export default ServiceStatusCard
