import { Undo2, X } from 'lucide-react'
import { useUndo } from '../lib/undo'

export default function UndoToast() {
  const toast = useUndo((s) => s.toast)
  const undo = useUndo((s) => s.undo)
  const dismiss = useUndo((s) => s.dismiss)
  if (!toast) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-4"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex max-w-md items-center gap-3 rounded-lg bg-slate-900 px-3 py-2 text-sm text-white shadow-lg">
        <span className="min-w-0 truncate">{toast.label}</span>
        <button
          onClick={undo}
          className="inline-flex items-center gap-1 font-semibold text-amber-300"
        >
          <Undo2 size={14} /> Undo
        </button>
        <button onClick={dismiss} aria-label="Dismiss" className="text-slate-400">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}