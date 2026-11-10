import { useState } from 'react'
import type { Assessment, GradeComponent } from '../types'
import { componentPercent } from '../lib/grading'
import { newComponent } from '../lib/tree'
import { ChevronDown, ChevronRight, Settings } from 'lucide-react'
import NumInput from './NumInput'
import { useStore } from '../store'

type Props = {
  node: GradeComponent
  depth: number
  edit: (id: string, fn: (c: GradeComponent) => GradeComponent) => void
  remove: (id: string) => void
}

const field = 'rounded border border-slate-300 bg-white px-2 py-1 text-sm'

type FormProps = {
  initial?: Assessment
  cancelLabel?: string
  onSave: (name: string, score: number | null, total: number) => void
  onCancel: () => void
  onDelete?: () => void
}

function ScoreForm({ initial, cancelLabel = 'Cancel', onSave, onCancel, onDelete }: FormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [score, setScore] = useState(
    initial === undefined || initial.score === null ? '' : String(initial.score)
  )
  const [total, setTotal] = useState(initial ? String(initial.total) : '')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const t = parseFloat(total)
    const s = score.trim() === '' ? null : parseFloat(score)
    if (!name.trim() || Number.isNaN(t) || t <= 0) return
    if (s !== null && Number.isNaN(s)) return
    onSave(name.trim(), s, t)
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded border border-slate-200 bg-white p-2">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Quiz 1"
        className={`w-full ${field}`}
      />
      <div className="flex items-center gap-2">
        <input
          value={score}
          onChange={(e) => setScore(e.target.value)}
          placeholder="Score"
          inputMode="decimal"
          className={`w-20 text-center ${field}`}
        />
        <span className="text-slate-300">/</span>
        <input
          value={total}
          onChange={(e) => setTotal(e.target.value)}
          placeholder="Out of"
          inputMode="decimal"
          className={`w-20 text-center ${field}`}
        />
      </div>
      <p className="text-xs text-slate-400">
        Leave the score blank if you haven't taken it yet.
      </p>
      <div className="flex items-center gap-3">
        <button className="rounded bg-slate-900 px-3 py-1 text-sm text-white">Save</button>
        <button type="button" onClick={onCancel} className="text-sm text-slate-500">
          {cancelLabel}
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="ml-auto text-sm text-red-600"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  )
}

export default function ComponentNode({ node, depth, edit, remove }: Props) {
  const undoable = useStore((s) => s.undoable)

  const [open, setOpen] = useState(depth < 2)
  const [setupOpen, setSetupOpen] = useState(false)
  const [scoresMode, setScoresMode] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addKey, setAddKey] = useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)

  const isRoot = depth === 0
  const childWord = depth === 0 ? 'component' : 'subcomponent'

  const percent = componentPercent(node)
  const hasSubs = node.subcomponents.length > 0
  const hasAssessments = node.assessments.length > 0
  const isEmpty = !hasSubs && !hasAssessments
  const showScores = hasAssessments || (isEmpty && scoresMode)
  const canCollapse = !isRoot && !isEmpty
  const expanded = open || isEmpty
  const assigned = node.subcomponents.reduce((acc, s) => acc + s.weight, 0)
  const mismatch = hasSubs && Math.abs(assigned - node.weight) > 0.001
  const scoredCount = node.assessments.filter((a) => a.score !== null).length
  const mode = node.mode ?? 'points'

  function addSub() {
    const remaining = Math.max(0, node.weight - assigned)
    edit(node.id, (c) => ({
      ...c,
      subcomponents: [
        ...c.subcomponents,
        newComponent(`New ${childWord}`, Number(remaining.toFixed(2))),
      ],
    }))
    setOpen(true)
  }

  function addAssessment(name: string, score: number | null, total: number) {
    edit(node.id, (c) => ({
      ...c,
      assessments: [...c.assessments, { id: crypto.randomUUID(), name, score, total }],
    }))
    setOpen(true)
    setAddKey((k) => k + 1)
  }

  function updateAssessment(id: string, patch: Partial<Assessment>) {
    edit(node.id, (c) => ({
      ...c,
      assessments: c.assessments.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }))
  }

  function removeAssessment(id: string) {
    const a = node.assessments.find((x) => x.id === id)
    undoable(`Deleted score "${a?.name ?? ''}"`, node.id, () =>
      edit(node.id, (c) => ({
        ...c,
        assessments: c.assessments.filter((x) => x.id !== id),
      }))
    )
  }

  const parts = [
    isRoot ? null : `${Number(node.weight.toFixed(2))}% of grade`,
    hasAssessments ? `${scoredCount} of ${node.assessments.length} scored` : null,
  ].filter(Boolean)

  return (
    <div>
      <div className="flex items-center gap-1">
        {isRoot ? null : canCollapse ? (
          <button onClick={() => setOpen(!open)} className="w-5 text-slate-400">
            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        ) : (
          <span className="w-5" />
        )}

        <p
          onClick={canCollapse ? () => setOpen(!open) : undefined}
          className={`min-w-0 flex-1 truncate ${
            isRoot ? 'text-base font-semibold' : 'font-medium'
          } ${canCollapse ? 'cursor-pointer' : ''}`}
        >
          {isRoot ? 'Whole course (100%)' : node.name}
        </p>

        {!isRoot && (
          <>
            <span className="text-sm font-semibold">
              {percent === null ? '—' : `${percent.toFixed(1)}%`}
            </span>
            <button
              onClick={() => setSetupOpen(!setupOpen)}
              aria-label="Component setup"
              className={`ml-1 flex h-7 w-7 items-center justify-center rounded ${
                setupOpen
                  ? 'bg-slate-200 text-slate-800'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <Settings size={16} />
            </button>
          </>
        )}
      </div>

      {parts.length > 0 && (
        <p className={`text-xs text-slate-400 ${isRoot ? '' : 'ml-6'}`}>
          {parts.join(' · ')}
        </p>
      )}

      {setupOpen && !isRoot && (
        <div className="ml-6 mt-2 space-y-3 rounded border border-slate-200 bg-white p-3 text-sm">
          <label className="block">
            <span className="text-xs text-slate-500">Name</span>
            <input
              value={node.name}
              onChange={(e) => edit(node.id, (c) => ({ ...c, name: e.target.value }))}
              className={`mt-1 w-full ${field}`}
            />
          </label>

          <label className="block">
            <span className="text-xs text-slate-500">Weight (% of the whole course)</span>
            <NumInput
              value={node.weight}
              onChange={(v) => edit(node.id, (c) => ({ ...c, weight: v }))}
              className={`mt-1 block w-20 text-center ${field}`}
            />
          </label>

          {node.assessments.length > 1 && (
            <div>
              <span className="text-xs text-slate-500">How scores are counted</span>
              <div className="mt-1 flex gap-2">
                {(['points', 'equal'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => edit(node.id, (c) => ({ ...c, mode: m }))}
                    className={`rounded border px-2 py-1 text-xs ${
                      mode === m
                        ? 'border-slate-700 bg-slate-800 text-white'
                        : 'border-slate-300 bg-white text-slate-600'
                    }`}
                  >
                    {m === 'points' ? 'by total points' : 'equal per item'}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            {!hasAssessments && (
              <button onClick={addSub} className="font-medium text-slate-700">
                + Add {childWord}
              </button>
            )}
            <button
              onClick={() => undoable(`Deleted "${node.name}"`, node.id, () => remove(node.id))}
              className="ml-auto text-red-600"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {expanded && (
        <div className={isRoot ? 'mt-3' : 'ml-6 mt-2'}>
          {isEmpty && !scoresMode && (
            <p className="text-sm text-slate-500">
              <button onClick={addSub} className="font-medium text-slate-800 underline">
                Add {childWord}s
              </button>
              {' or '}
              <button
                onClick={() => {
                  setScoresMode(true)
                  setAdding(true)
                }}
                className="font-medium text-slate-800 underline"
              >
                add scores
              </button>
            </p>
          )}

          {hasSubs && (
            <>
              <div className="space-y-4 border-l border-slate-200 pl-3">
                {node.subcomponents.map((sub) => (
                  <ComponentNode
                    key={sub.id}
                    node={sub}
                    depth={depth + 1}
                    edit={edit}
                    remove={remove}
                  />
                ))}
              </div>
              {mismatch && (
                <p className="mt-2 text-xs text-amber-700">
                  {childWord[0].toUpperCase() + childWord.slice(1)}s add up to{' '}
                  {Number(assigned.toFixed(2))}%, but this should total{' '}
                  {Number(node.weight.toFixed(2))}%.
                </p>
              )}
              {isRoot && (
                <button
                  onClick={addSub}
                  className="mt-3 text-sm font-medium text-slate-600"
                >
                  + Add {childWord}
                </button>
              )}
            </>
          )}

          {showScores && (
            <div>
              <div className="divide-y divide-slate-100">
                {node.assessments.map((a) =>
                  editingId === a.id ? (
                    <div key={a.id} className="py-2">
                      <ScoreForm
                        initial={a}
                        onSave={(name, score, total) => {
                          updateAssessment(a.id, { name, score, total })
                          setEditingId(null)
                        }}
                        onCancel={() => setEditingId(null)}
                        onDelete={() => {
                          removeAssessment(a.id)
                          setEditingId(null)
                        }}
                      />
                    </div>
                  ) : (
                    <button
                      key={a.id}
                      onClick={() => setEditingId(a.id)}
                      className="flex w-full items-center gap-2 py-2 text-left text-sm"
                    >
                      <span className="min-w-0 flex-1 truncate">{a.name}</span>
                      {a.score === null ? (
                        <span className="text-xs italic text-slate-400">
                          not taken yet · {a.total} pts
                        </span>
                      ) : (
                        <>
                          <span className="text-slate-600">
                            {a.score}/{a.total}
                          </span>
                          <span className="w-11 text-right text-xs text-slate-400">
                            {a.total > 0
                              ? `${((a.score / a.total) * 100).toFixed(0)}%`
                              : '—'}
                          </span>
                        </>
                      )}
                    </button>
                  )
                )}
              </div>

              <div className="mt-2">
                {adding ? (
                  <ScoreForm
                    key={addKey}
                    cancelLabel="Done"
                    onSave={addAssessment}
                    onCancel={() => setAdding(false)}
                  />
                ) : (
                  <button
                    onClick={() => setAdding(true)}
                    className="text-sm font-medium text-slate-600"
                  >
                    + Add score
                  </button>
                )}
              </div>

              {!hasAssessments && (
                <button
                  onClick={() => {
                    setScoresMode(false)
                    setAdding(false)
                  }}
                  className="mt-2 text-xs text-slate-400"
                >
                  ← Use {childWord}s instead
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}