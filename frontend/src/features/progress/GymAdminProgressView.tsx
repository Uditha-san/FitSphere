import React, { useState, useEffect } from 'react'
import {
  Plus,
  LayoutGrid,
  List,
  Loader2,
  RefreshCw,
  AlertCircle,
  Building2,
  Activity,
} from 'lucide-react'
import { progressApi } from '../../services/progressApi'
import { useAuth } from '../../context/AuthContext'
import type { ProgressRecord } from '../../types/progress'
import type { User } from '../../types/auth'
import ProgressMeasurementsTable from './ProgressMeasurementsTable'
import ProgressRecordCard from './ProgressRecordCard'
import CreateProgressRecordModal from './CreateProgressRecordModal'
import EditProgressRecordModal from './EditProgressRecordModal'

export const GymAdminProgressView: React.FC = () => {
  const { token } = useAuth()
  const [records, setRecords] = useState<ProgressRecord[]>([])
  const [clients, setClients] = useState<User[]>([])
  const [coaches, setCoaches] = useState<User[]>([])
  const [selectedCoachId, setSelectedCoachId] = useState<string>('')
  const [selectedClientId, setSelectedClientId] = useState<string>('')

  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<ProgressRecord | null>(null)

  // Load tenant users (clients and coaches)
  useEffect(() => {
    if (!token) return

    let cancelled = false
    fetch('/api/v1/users/?limit=100', {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((usersList: User[]) => {
        if (!cancelled && Array.isArray(usersList)) {
          setClients(usersList.filter((u) => u.role === 'client'))
          setCoaches(usersList.filter((u) => u.role === 'coach'))
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [token])

  const loadData = async () => {
    if (!token) return
    setLoading(true)
    setError(null)

    try {
      const data = await progressApi.listProgressRecords(
        {
          coach_id: selectedCoachId || undefined,
          client_id: selectedClientId || undefined,
        },
        token
      )
      setRecords(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load gym progress records.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [token, selectedCoachId, selectedClientId])

  const handleDelete = async (record: ProgressRecord) => {
    if (!window.confirm('Are you sure you want to delete this progress record?')) return
    if (!token) return

    try {
      await progressApi.deleteProgressRecord(record.id, token)
      setRecords((prev) => prev.filter((r) => r.id !== record.id))
    } catch (err: any) {
      alert(err.message || 'Failed to delete record.')
    }
  }

  // Calculate quick stats
  const uniqueClients = new Set(records.map((r) => r.client_id)).size
  const uniqueCoaches = new Set(records.map((r) => r.coach_id)).size

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 p-5 rounded-2xl border border-slate-800 backdrop-blur-sm">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <Building2 className="h-5 w-5 text-indigo-400" />
            Facility Progress Oversight
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Audit and manage all client progress check-ins recorded across your facility
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Coach Filter */}
          <select
            value={selectedCoachId}
            onChange={(e) => setSelectedCoachId(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-2 text-xs font-semibold text-white focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Coaches</option>
            {coaches.map((c) => (
              <option key={c.id} value={c.id}>
                Coach: {c.full_name || c.email}
              </option>
            ))}
          </select>

          {/* Client Filter */}
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-2 text-xs font-semibold text-white focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                Client: {c.full_name || c.email}
              </option>
            ))}
          </select>

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

          {/* Log Record */}
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            disabled={clients.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span>Log Check-In</span>
          </button>
        </div>
      </div>

      {/* Facility Quick Stat Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Check-Ins Logged
          </span>
          <div className="text-2xl font-black text-white mt-1">{records.length}</div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Tracked Clients
          </span>
          <div className="text-2xl font-black text-indigo-400 mt-1">{uniqueClients}</div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Active Coaches Recording
          </span>
          <div className="text-2xl font-black text-emerald-400 mt-1">{uniqueCoaches}</div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400 mb-3" />
          <p className="text-sm">Loading facility progress records...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center text-slate-400">
          <Activity className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No Check-Ins Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            No progress records match the active filters. Coaches in this facility can log assessments for their assigned clients.
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <ProgressMeasurementsTable
          records={records}
          showClientColumn={true}
          showCoachColumn={true}
          canManage={true}
          onEdit={(rec) => setEditingRecord(rec)}
          onDelete={handleDelete}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {records.map((rec) => (
            <ProgressRecordCard
              key={rec.id}
              record={rec}
              canManage={true}
              showClient={true}
              showCoach={true}
              onEdit={(r) => setEditingRecord(r)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {isCreateOpen && token && (
        <CreateProgressRecordModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          token={token}
          clients={clients}
          preselectedClientId={selectedClientId}
          onSuccess={(newRec) => {
            setRecords((prev) => [newRec, ...prev])
          }}
        />
      )}

      {/* Edit Modal */}
      {editingRecord && token && (
        <EditProgressRecordModal
          isOpen={Boolean(editingRecord)}
          record={editingRecord}
          onClose={() => setEditingRecord(null)}
          token={token}
          onSuccess={(updatedRec) => {
            setRecords((prev) => prev.map((r) => (r.id === updatedRec.id ? updatedRec : r)))
          }}
        />
      )}
    </div>
  )
}
export default GymAdminProgressView
