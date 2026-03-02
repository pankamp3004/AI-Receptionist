'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { AIConfiguration } from '@/types'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Plus, Trash2, Save, Bot } from 'lucide-react'

interface MappingEditorProps {
  title: string
  description: string
  data: Record<string, string | string[]>
  onChange: (val: Record<string, string | string[]>) => void
  multiValue?: boolean
}

function MappingEditor({ title, description, data, onChange, multiValue = false }: MappingEditorProps) {
  const [entries, setEntries] = useState<{ key: string; value: string }[]>([])

  useEffect(() => {
    const e = Object.entries(data).map(([key, value]) => ({
      key,
      value: Array.isArray(value) ? value.join(', ') : String(value),
    }))
    setEntries(e.length > 0 ? e : [{ key: '', value: '' }])
  }, [])

  const sync = (updated: { key: string; value: string }[]) => {
    const obj: Record<string, string | string[]> = {}
    for (const { key, value } of updated) {
      if (key.trim()) {
        obj[key.trim()] = multiValue
          ? value.split(',').map((v) => v.trim()).filter(Boolean)
          : value.trim()
      }
    }
    onChange(obj)
  }

  const update = (idx: number, field: 'key' | 'value', val: string) => {
    const updated = entries.map((e, i) => (i === idx ? { ...e, [field]: val } : e))
    setEntries(updated)
    sync(updated)
  }

  const add = () => {
    const updated = [...entries, { key: '', value: '' }]
    setEntries(updated)
  }

  const remove = (idx: number) => {
    const updated = entries.filter((_, i) => i !== idx)
    setEntries(updated.length ? updated : [{ key: '', value: '' }])
    sync(updated)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{description}</p>
          </div>
          <button
            type="button"
            onClick={add}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {entries.map((entry, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <Input
                id={`key-${idx}`}
                placeholder={multiValue ? 'Specialty (e.g. Cardiology)' : 'Symptom (e.g. chest pain)'}
                value={entry.key}
                onChange={(e) => update(idx, 'key', e.target.value)}
              />
              <span className="text-gray-400 font-medium">→</span>
              <Input
                id={`val-${idx}`}
                placeholder={multiValue ? 'Keywords, comma-separated' : 'Specialty name'}
                value={entry.value}
                onChange={(e) => update(idx, 'value', e.target.value)}
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => remove(idx)}
                className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default function AIConfigPage() {
  const qc = useQueryClient()
  const [specialtyMappings, setSpecialtyMappings] = useState<Record<string, string[]>>({})
  const [symptomMappings, setSymptomMappings] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  const [ready, setReady] = useState(false)

  const { data: config, isLoading } = useQuery<AIConfiguration>({
    queryKey: ['ai-config'],
    queryFn: async () => (await api.get('/api/v1/ai-config')).data,
  })

  useEffect(() => {
    if (config) {
      setSpecialtyMappings((config.specialty_mappings as Record<string, string[]>) || {})
      setSymptomMappings((config.symptom_mappings as Record<string, string>) || {})
      setReady(true)
    }
  }, [config])

  const saveMutation = useMutation({
    mutationFn: () =>
      api.put('/api/v1/ai-config', {
        specialty_mappings: specialtyMappings,
        symptom_mappings: symptomMappings,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-config'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  if (isLoading || !ready) return <LoadingSpinner />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 rounded-lg p-2">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Configuration</h1>
            <p className="text-gray-500 mt-0.5">Configure how the AI receptionist maps symptoms to specialties</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-sm text-green-600 font-medium bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
              ✓ Saved successfully
            </span>
          )}
          <Button
            onClick={() => saveMutation.mutate()}
            loading={saveMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" /> Save Configuration
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-start gap-3 bg-blue-50 rounded-lg p-4 border border-blue-100">
              <Bot className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">How AI Configuration Works</p>
                <p className="text-blue-700">
                  <strong>Specialty Mappings</strong> define which keywords trigger routing to a specific medical specialty.
                  <br />
                  <strong>Symptom Mappings</strong> map patient symptoms directly to a specialty for appointment booking.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <MappingEditor
          title="Specialty Keyword Mappings"
          description="Map specialty names to recognition keywords (comma-separated)"
          data={specialtyMappings}
          onChange={(val) => setSpecialtyMappings(val as Record<string, string[]>)}
          multiValue={true}
        />

        <MappingEditor
          title="Symptom → Specialty Mappings"
          description="Map patient symptoms to the appropriate medical specialty"
          data={symptomMappings}
          onChange={(val) => setSymptomMappings(val as Record<string, string>)}
          multiValue={false}
        />
      </div>
    </div>
  )
}
