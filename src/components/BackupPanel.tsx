import { useRef, useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { useStore } from '../store'
import type { AppData } from '../types'
import { describeData, downloadBackup, lastBackupAt, readBackupFile } from '../lib/backup'

const REMIND_AFTER_DAYS = 14

export default function BackupPanel() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<{ data: AppData; name: string } | null>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [, bump] = useState(0)

  const hasData = useStore((s) => s.semesters.length > 0 || s.pastTerms.length > 0)

  const last = lastBackupAt()
  const daysSince = last === null ? null : (Date.now() - last) / 86_400_000
  const showReminder = hasData && (daysSince === null || daysSince > REMIND_AFTER_DAYS)

  function handleExport() {
    const { semesters, activeId, pastTerms, profile } = useStore.getState()
    downloadBackup({ semesters, activeId, pastTerms, profile })
    setMessage({ kind: 'ok', text: 'Backup downloaded. Keep the file somewhere safe.' })
    bump((n) => n + 1)
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // lets the same file be picked again later
    if (!file) return
    try {
      const data = await readBackupFile(file)
      setPending({ data, name: file.name })
      setMessage(null)
    } catch (err) {
      setPending(null)
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Import failed.' })
    }
  }

  function applyReplace() {
    if (!pending) return
    useStore.getState().replaceAll(pending.data)
    setMessage({ kind: 'ok', text: `Replaced everything with ${describeData(pending.data)}.` })
    setPending(null)
  }

  function applyMerge() {
    if (!pending) return
    const r = useStore.getState().mergeData(pending.data)
    const skipped =
      pending.data.semesters.length - r.addedSemesters
    setMessage({
      kind: 'ok',
      text:
        `Added ${r.addedSemesters} semester${r.addedSemesters === 1 ? '' : 's'}` +
        (skipped > 0 ? ` (${skipped} already here, skipped)` : '') +
        '.',
    })
    setPending(null)
  }

  return (
    <section className="space-y-2 text-sm">
      <h3 className="font-semibold">Backup</h3>

      {showReminder && (
        <p className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-800">
          {daysSince === null
            ? 'You have not backed up yet. Your data only lives in this browser.'
            : 'It has been a while since your last backup.'}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1"
        >
          <Download size={14} /> Export
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1"
        >
          <Upload size={14} /> Import
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={handleFile}
          className="hidden"
        />
      </div>

      {pending && (
        <div className="space-y-2 rounded border border-slate-300 bg-slate-50 p-2">
          <p className="text-xs">
            <span className="font-medium">{pending.name}</span> contains{' '}
            {describeData(pending.data)}.
          </p>
          <div className="flex flex-wrap gap-2">
            <button onClick={applyMerge} className="rounded border border-slate-300 px-2 py-1">
              Add to my data
            </button>
            <button
              onClick={applyReplace}
              className="rounded border border-red-300 px-2 py-1 text-red-700"
            >
              Replace my data
            </button>
            <button onClick={() => setPending(null)} className="px-2 py-1 text-slate-600">
              Cancel
            </button>
          </div>
          <p className="text-xs text-slate-600">
            "Replace" erases what is on this device now. Export first if unsure.
          </p>
        </div>
      )}

      {message && (
        <p className={`text-xs ${message.kind === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>
          {message.text}
        </p>
      )}
    </section>
  )
}