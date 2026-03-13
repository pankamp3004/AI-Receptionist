'use client'
import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Card, CardContent } from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Badge from '@/components/ui/Badge'
import { BookOpen, UploadCloud, Trash2, FileText, AlertCircle, CheckCircle2 } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import toast from 'react-hot-toast'

interface KnowledgeDocument {
  id: string
  organization_id: string
  filename: string
  file_size_bytes: number
  status: string
  error_message?: string
  created_at: string
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export default function KnowledgeBasePage() {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const queryClient = useQueryClient()

  // Fetch documents
  const { data: documents, isLoading } = useQuery<KnowledgeDocument[]>({
    queryKey: ['knowledge-documents'],
    queryFn: async () => (await api.get('/api/v1/knowledge')).data,
    // Poll every 3 seconds if any doc is processing
    refetchInterval: (query) => {
      const hasProcessing = query.state.data?.some((doc) => doc.status === 'processing')
      return hasProcessing ? 3000 : false
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => await api.delete(`/api/v1/knowledge/${id}`),
    onSuccess: () => {
      toast.success('Document deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['knowledge-documents'] })
    },
    onError: () => toast.error('Failed to delete document'),
  })

  // Handle file upload
  const uploadFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are supported')
      return
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('File size must be less than 10MB')
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    setIsUploading(true)
    try {
      await api.post('/api/v1/knowledge/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('File uploaded successfully. Processing started.')
      queryClient.invalidateQueries({ queryKey: ['knowledge-documents'] })
    } catch (error) {
      toast.error('Failed to upload document')
    } finally {
      setIsUploading(false)
    }
  }

  // Drag handlers
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFile(e.dataTransfer.files[0])
    }
  }, [])

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFile(e.target.files[0])
    }
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 rounded-lg p-2">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
            <p className="text-gray-500 mt-0.5">
              Upload policies and FAQs for the AI receptionist to use during calls
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Section */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Document</h3>
              
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'
                } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <UploadCloud className="h-10 w-10 text-blue-500 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-900 mb-1">
                  Drag and drop your PDF here
                </p>
                <p className="text-xs text-gray-500 mb-4">Maximum file size: 10MB</p>
                
                <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors inline-block">
                  {isUploading ? 'Uploading...' : 'Browse Files'}
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,application/pdf"
                    onChange={onFileInput}
                    disabled={isUploading}
                  />
                </label>
              </div>

              <div className="mt-6 bg-blue-50 rounded-lg p-4 flex gap-3 text-blue-800">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold mb-1">How it works</p>
                  <p className="text-blue-700 opacity-90">
                    Uploaded documents are securely processed and converted into a searchable format. 
                    The AI receptionist will automatically search these documents when callers ask related questions.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Documents List */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Your Documents</h3>
                <span className="text-sm text-gray-500">{documents?.length || 0} files</span>
              </div>
              
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-6 py-3 font-medium text-gray-500">File Name</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Size</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Uploaded</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {documents?.map((doc) => (
                    <tr key={doc.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-900 truncate max-w-[200px]" title={doc.filename}>
                            {doc.filename}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{formatBytes(doc.file_size_bytes)}</td>
                      <td className="px-6 py-4">
                        {doc.status === 'processing' && (
                          <Badge variant="warning" className="animate-pulse">Processing</Badge>
                        )}
                        {doc.status === 'ready' && (
                          <Badge variant="success" className="flex w-max items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Ready
                          </Badge>
                        )}
                        {doc.status === 'error' && (
                          <div className="group relative">
                            <Badge variant="danger">Failed</Badge>
                            {doc.error_message && (
                              <div className="absolute hidden group-hover:block bottom-full mb-2 left-0 w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                                {doc.error_message}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                        {formatDateTime(doc.created_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this document? The AI will no longer use it.')) {
                              deleteMutation.mutate(doc.id)
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                          title="Delete document"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  
                  {(!documents || documents.length === 0) && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <BookOpen className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">No documents uploaded yet</p>
                        <p className="text-gray-400 text-sm mt-1">Upload a PDF to get started</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
