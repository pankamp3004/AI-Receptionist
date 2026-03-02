'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { CallLog } from '@/types'
import { Card, CardContent } from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import { Phone, Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

const PAGE_SIZE = 20

export default function CallLogsPage() {
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<CallLog | null>(null)

  const { data: logs, isLoading } = useQuery<CallLog[]>({
    queryKey: ['call-logs', page],
    queryFn: async () =>
      (await api.get(`/api/v1/call-logs?skip=${page * PAGE_SIZE}&limit=${PAGE_SIZE}`)).data,
  })

  if (isLoading) return <LoadingSpinner />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-pink-600 rounded-lg p-2">
            <Phone className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Call Logs</h1>
            <p className="text-gray-500 mt-0.5">AI receptionist call history and transcripts</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>{logs?.length ?? 0} records shown</span>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-3 font-medium text-gray-500">Phone</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Summary</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Date & Time</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {logs?.map((log) => (
                <tr key={log.session_id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900 font-mono">
                    {log.phone_number}
                  </td>
                  <td className="px-6 py-4 text-gray-600 max-w-xs">
                    <p className="truncate">{log.intent || 'No summary'}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{formatDateTime(log.started_at)}</td>
                  <td className="px-6 py-4">
                    <Badge variant={log.transcript ? 'success' : 'default'}>
                      {log.transcript ? 'Transcribed' : 'No transcript'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setSelected(log)}
                      className="text-gray-400 hover:text-blue-600 transition-colors"
                      title="View transcript"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {!logs?.length && (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <Phone className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">No call logs yet</p>
                    <p className="text-gray-400 text-xs mt-1">
                      Call logs will appear here after the AI receptionist handles calls
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {(logs?.length === PAGE_SIZE || page > 0) && (
        <div className="flex items-center justify-between mt-4 px-1">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <span className="text-sm text-gray-500">Page {page + 1}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={(logs?.length ?? 0) < PAGE_SIZE}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Transcript Modal */}
      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={`Call — ${selected?.phone_number}`}
      >
        {selected && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Date & Time
              </p>
              <p className="text-sm text-gray-700">{formatDateTime(selected.started_at)}</p>
            </div>
            {selected.intent && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Summary
                </p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 border border-gray-200">
                  {selected.intent}
                </p>
              </div>
            )}
            {selected.transcript ? (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Transcript
                </p>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 max-h-80 overflow-y-auto">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                    {selected.transcript}
                  </pre>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No transcript available for this call.</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
