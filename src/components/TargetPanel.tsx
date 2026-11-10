import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, SlidersHorizontal, Target } from 'lucide-react'
import type { Bracket, Course } from '../types'
import {
  MAX_PERCENT,
  componentPercent,
  leaves,
  neededPercent,
  projectedPercent,
  rawNeeded,
} from '../lib/grading'
import type { Leaf } from '../lib/grading'

type Props = {
  course: Course
}

function itemLabel(l: Leaf): string {
  return l.group ? `${l.group} › ${l.name}` : l.name
}

function listNames(items: Leaf[]): string {
  if (items.length <= 3) return items.map(itemLabel).join(', ')
  return `${items.length} items`
}

function gradeAt(percent: number, brackets: Bracket[]): string | null {
  const hit = brackets.find((b) => percent >= b.min)
  return hit ? hit.grade : null
}

function shortLabel(needed: number | null): string {
  if (needed === null) return '—'
  if (needed <= 0) return 'Secured'
  if (needed > MAX_PERCENT) return 'Out of reach'
  return `${needed.toFixed(1)}%`
}

export default function TargetPanel({ course }: Props) {
  const [open, setOpen] = useState(false)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [off, setOff] = useState<Set<string>>(new Set())
  const [assumeText, setAssumeText] = useState<string | null>(null)
  const [targetId, setTargetId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  const ls = useMemo(() => leaves(course.root), [course.root])
  const pending = ls.filter((l) => l.score === null)
  const selected = pending.filter((l) => !off.has(l.id))
  const unselected = pending.filter((l) => off.has(l.id))
  const solveIds = new Set(selected.map((l) => l.id))

  const current = componentPercent(course.root)
  const parsed = assumeText === null ? NaN : parseFloat(assumeText)
  const assume = Number.isNaN(parsed) ? (current ?? 0) : parsed

  const brackets = useMemo(
    () =>
      course.brackets
        .filter((b) => b.grade.trim() !== '' && b.min <= b.max)
        .sort((a, b) => b.min - a.min),
    [course.brackets]
  )

  let defaultIndex = 0
  if (current !== null && brackets.length > 0) {
    const idx = brackets.findIndex((b) => current >= b.min)
    defaultIndex = idx === -1 ? brackets.length - 1 : Math.max(0, idx - 1)
  }
  const target = brackets.find((b) => b.id === targetId) ?? brackets[defaultIndex]
  const needed = target ? neededPercent(ls, solveIds, assume, target.min) : null

  const adjustVisible = adjustOpen || selected.length === 0

  function toggle(id: string) {
    setOff((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function summary(): { tone: string; text: string } | null {
    if (!target) return null
    if (needed === null) {
      return {
        tone: 'text-slate-500',
        text: 'Turn on at least one item below to see what you need.',
      }
    }
    if (needed <= 0) {
      return {
        tone: 'text-emerald-700',
        text: `You're already on track for ${target.grade}, even with 0% on ${listNames(selected)}.`,
      }
    }
    if (needed > MAX_PERCENT) {
      const best = projectedPercent(ls, solveIds, assume, MAX_PERCENT)
      const bestGrade = gradeAt(best, brackets)
      const hint =
        unselected.length > 0
          ? ' Try counting on more of the remaining items.'
          : ' It is out of reach with the work that is left.'
      return {
        tone: 'text-amber-700',
        text: `${target.grade} can't be reached with ${listNames(selected)} alone. Full marks would only bring you to ${bestGrade ?? 'below the scale'} (${best.toFixed(1)}%).${hint}`,
      }
    }
    return {
      tone: 'text-slate-900',
      text: `To finish with ${target.grade}, you need ${needed.toFixed(1)}%${selected.length > 1 ? ' on average' : ''} on ${listNames(selected)}.`,
    }
  }

  const result = summary()
  const showItems = needed !== null && needed > 0 && needed <= MAX_PERCENT

  return (
    <section className="mt-8">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800"
      >
        <Target size={16} className="text-slate-500" />
        <span className="flex-1 text-left">What do I need?</span>
        {open ? (
          <ChevronDown size={16} className="text-slate-400" />
        ) : (
          <ChevronRight size={16} className="text-slate-400" />
        )}
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {brackets.length === 0 && (
            <p className="text-sm text-slate-500">
              Set the grade scale first, so there are grades to aim for.
            </p>
          )}

          {brackets.length > 0 && pending.length === 0 && (
            <p className="text-sm text-slate-500">
              Nothing left to solve for. Add the work you haven't taken yet with its
              total and a blank score, and it will show up here.
            </p>
          )}

          {brackets.length > 0 && pending.length > 0 && target && (
            <>
              <label className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                I want to finish with
                <select
                  value={target.id}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="rounded border border-slate-300 bg-white px-2 py-1 font-semibold"
                >
                  {brackets.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.grade} ({b.min}% and up)
                    </option>
                  ))}
                </select>
              </label>

              {result && (
                <div className="rounded border border-slate-200 bg-white p-4">
                  <p className={`text-base font-medium ${result.tone}`}>{result.text}</p>

                  {showItems && (
                    <ul className="mt-3 space-y-1 text-sm text-slate-600">
                      {selected.map((l) => (
                        <li key={l.id} className="flex justify-between gap-3">
                          <span>{itemLabel(l)}</span>
                          <span className="font-medium">
                            {rawNeeded(needed, l.total)} / {l.total}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {unselected.length > 0 && (
                    <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
                      Assuming {listNames(unselected)} will score {Number(assume.toFixed(1))}%.
                    </p>
                  )}
                </div>
              )}

              <div>
                <button
                  onClick={() => setAdjustOpen(!adjustVisible)}
                  disabled={selected.length === 0}
                  className="flex items-center gap-1.5 text-sm font-medium text-slate-600"
                >
                  <SlidersHorizontal size={14} />
                  Adjust assumptions
                  {off.size > 0 && (
                    <span className="rounded-full bg-slate-200 px-1.5 text-xs text-slate-700">
                      {off.size} left out
                    </span>
                  )}
                </button>

                {adjustVisible && (
                  <div className="mt-3 space-y-4 rounded border border-slate-200 bg-white p-3">
                    <div>
                      <p className="mb-2 text-sm text-slate-700">
                        Work to solve for{' '}
                        <span className="text-xs text-slate-400">
                          (tap to leave one out)
                        </span>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {pending.map((l) => {
                          const active = !off.has(l.id)
                          return (
                            <button
                              key={l.id}
                              onClick={() => toggle(l.id)}
                              className={`rounded-full border px-3 py-1 text-sm ${
                                active
                                  ? 'border-slate-700 bg-slate-800 text-white'
                                  : 'border-slate-300 bg-white text-slate-500'
                              }`}
                            >
                              {itemLabel(l)} · {Number(l.weight.toFixed(2))}%
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {unselected.length > 0 && (
                      <label className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                        Left-out items will score
                        <input
                          value={
                            assumeText ?? (current === null ? '0' : current.toFixed(2))
                          }
                          onChange={(e) => setAssumeText(e.target.value)}
                          inputMode="decimal"
                          className="w-16 rounded border border-slate-300 bg-white px-2 py-1 text-center text-sm"
                        />
                        %
                      </label>
                    )}
                  </div>
                )}
              </div>

              <div>
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="flex items-center gap-1 text-sm font-medium text-slate-600"
                >
                  {showAll ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  See all grades
                </button>

                {showAll && (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-xs text-slate-400">
                      Tap a grade to use it as your target.
                    </p>
                    {brackets.map((b) => {
                      const n = neededPercent(ls, solveIds, assume, b.min)
                      const picked = b.id === target.id
                      const muted = n === null || n <= 0 || n > MAX_PERCENT
                      return (
                        <button
                          key={b.id}
                          onClick={() => setTargetId(b.id)}
                          className={`flex w-full items-center justify-between rounded border px-3 py-2 text-left ${
                            picked
                              ? 'border-slate-700 bg-slate-100'
                              : 'border-slate-200 bg-white'
                          }`}
                        >
                          <span className="text-sm font-semibold">
                            {b.grade}
                            <span className="ml-2 text-xs font-normal text-slate-400">
                              {b.min}% and up
                            </span>
                          </span>
                          <span
                            className={`text-sm ${
                              muted ? 'text-slate-400' : 'text-slate-800'
                            }`}
                          >
                            {shortLabel(n)}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  )
}