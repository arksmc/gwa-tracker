import type { Bracket } from '../types'
import { validateBrackets } from '../lib/brackets'
import NumInput from './NumInput'

const EXAMPLE: [number, number, string][] = [
  [97, 100, '1.00'],
  [94, 96.99, '1.25'],
  [91, 93.99, '1.50'],
  [88, 90.99, '1.75'],
  [85, 87.99, '2.00'],
  [82, 84.99, '2.25'],
  [79, 81.99, '2.50'],
]

type Props = {
  brackets: Bracket[]
  onChange: (b: Bracket[]) => void
}

const small = 'rounded border border-slate-300 bg-white px-2 py-1 text-center'

export default function BracketEditor({ brackets, onChange }: Props) {
  const issues = validateBrackets(brackets)

  function patch(id: string, p: Partial<Bracket>) {
    onChange(brackets.map((b) => (b.id === id ? { ...b, ...p } : b)))
  }

  function add() {
    onChange([...brackets, { id: crypto.randomUUID(), min: 0, max: 0, grade: '' }])
  }

  function loadExample() {
    onChange(
      EXAMPLE.map(([min, max, grade]) => ({
        id: crypto.randomUUID(),
        min,
        max,
        grade,
      }))
    )
  }

  return (
    <div>
      {brackets.length === 0 && (
        <p className="mb-3 text-sm text-slate-500">
          No scale set. Add brackets so this course can show an academic grade.
        </p>
      )}

      <div className="space-y-2">
        {brackets.map((b) => (
          <div key={b.id} className="flex items-center gap-2">
            <NumInput
              value={b.min}
              onChange={(v) => patch(b.id, { min: v })}
              className={`w-16 ${small}`}
            />
            <span className="text-slate-400">to</span>
            <NumInput
              value={b.max}
              onChange={(v) => patch(b.id, { max: v })}
              className={`w-16 ${small}`}
            />
            <span className="text-slate-400">→</span>
            <input
              value={b.grade}
              onChange={(e) => patch(b.id, { grade: e.target.value })}
              placeholder="Grade"
              className={`w-16 ${small}`}
            />
            <button
              onClick={() => onChange(brackets.filter((x) => x.id !== b.id))}
              className="text-slate-400 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {issues.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-amber-700">
          {issues.map((msg, i) => (
            <li key={i}>{msg}</li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex gap-4">
        <button onClick={add} className="text-sm font-medium text-slate-700">
          + Add bracket
        </button>
        <button onClick={loadExample} className="text-sm text-slate-500">
          Load example scale
        </button>
      </div>
    </div>
  )
}