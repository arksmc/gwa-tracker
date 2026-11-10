import { create } from 'zustand'

type Toast = { id: number; label: string; restore: () => void }

type UndoState = {
  toast: Toast | null
  show: (label: string, restore: () => void) => void
  undo: () => void
  dismiss: () => void
}

let timer: ReturnType<typeof setTimeout> | undefined

export const useUndo = create<UndoState>((set, get) => ({
  toast: null,
  show: (label, restore) => {
    clearTimeout(timer)
    set({ toast: { id: Date.now(), label, restore } })
    timer = setTimeout(() => set({ toast: null }), 8000)
  },
  undo: () => {
    const t = get().toast
    if (!t) return
    clearTimeout(timer)
    set({ toast: null })
    t.restore()
  },
  dismiss: () => {
    clearTimeout(timer)
    set({ toast: null })
  },
}))