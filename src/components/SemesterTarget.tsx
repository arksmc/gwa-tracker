import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { Semester } from '../types'
import { priorityLines, semesterRange, targetPlan } from '../lib/grading'

type Props = {
  semester: Semester
  onTargetChange: (value: number | null) => void
}

export default function SemesterTarget({ semester, onTargetChange }: Props) {
  const [open, setOpen] = useState(semester.targetGwa !== undefined)
  const [text, setText] = useState(
    semester.targetGwa === undefined ? '' : String(semester.targetGwa)
  )
  const [priorityId, setPriorityId] = useState<string | null>(null)

  if (semester.courses.length === 0) return null

  const target = semester.targetGwa
  const range = semesterRange(semester.courses)
  const plan = target === undefined ? null : targetPlan(range, target)
  const notCounted = range.rows.filter((r) => r.skip !== null).length

  const priority =
    plan === null
      ? null
      : (plan.openRows.find((r) => r.course.id === priorityId) ?? plan.openRows[0] ?? null)
  const others =
    plan && priority ? plan.openRows.filter((r) => r.course.id !== priority.course.id) : []
  const lines =
    plan && target !== undefined && priority
      ? priorityLines(plan, target, priority.course.id)
      : []
  const othersLabel = others.length === 1 ? others[0].course.code : 'the rest'

  function change(value: string) {
    setText(value)
    if (value.trim() === '') {
      onTargetChange(null)
      return
    }
    const n = parseFloat(value)
    if (!Number.isNaN(n) && n > 0) onTargetChange(n)
  }

  return (
    <section className="mt-8">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1 text-sm font-medium uppercase tracking-wide text-slate-500"
      >
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        Aim for a GWA
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <label className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
            I want a GWA of
            <input
              value={text}
              onChange={(e) => change(e.target.value)}
              inputMode="decimal"
              placeholder="1.75"
              className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-center font-semibold"
            />
            or better
          </label>

          {plan && target !== undefined && (
            <div className="space-y-3 rounded border border-slate-200 bg-white p-4">
              {plan.status === 'no-courses' && (
                <p className="text-sm text-slate-500">
                  Add work and a grade scale to your courses to plan toward this.
                </p>
              )}

              {plan.status === 'secured' && range.worstGwa !== null && (
                <p className="font-medium text-emerald-700">
                  Secured. Even with zeros on everything left, your GWA would be{' '}
                  {range.worstGwa.toFixed(2)}.
                </p>
              )}

              {plan.status === 'unreachable' && range.bestGwa !== null && (
                <p className="font-medium text-amber-700">
                  Out of reach. Even full marks on everything left would give{' '}
                  {range.bestGwa.toFixed(2)}.
                </p>
              )}

              {plan.status === 'open' && plan.neededAverage !== null && (
                <p className="font-medium text-slate-900">
                  You need to average {plan.neededAverage.toFixed(2)} or better across{' '}
                  {plan.openRows.map((r) => r.course.code).join(', ')}.
                </p>
              )}

              {plan.fixedRows.length > 0 && plan.status !== 'no-courses' && (
                <p className="text-xs text-slate-500">
                  Fixed grades:{' '}
                  {plan.fixedRows.map((r) => `${r.course.code} (${r.best})`).join(', ')}
                </p>
              )}

              {plan.status === 'open' && plan.openRows.length >= 2 && priority && (
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <label className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                    Which course are you prioritizing?
                    <select
                      value={priority.course.id}
                      onChange={(e) => setPriorityId(e.target.value)}
                      className="rounded border border-slate-300 bg-white px-2 py-1 font-semibold"
                    >
                      {plan.openRows.map((r) => (
                        <option key={r.course.id} value={r.course.id}>
                          {r.course.code}
                        </option>
                      ))}
                    </select>
                  </label>

                  <ul className="space-y-1 text-sm text-slate-600">
                    {lines.map((l) => (
                      <li key={l.grade} className="flex justify-between gap-3">
                        <span>
                          {l.grade.toFixed(2)} in {priority.course.code}
                        </span>
                        <span
                          className={`text-right ${
                            l.outcome === 'no' ? 'text-slate-400' : 'font-medium text-slate-800'
                          }`}
                        >
                          {l.outcome === 'no' && 'not enough'}
                          {l.outcome === 'any' && `any grade on ${othersLabel} works`}
                          {l.outcome === 'need' &&
                            l.needed !== null &&
                            (l.needGrade !== null
                              ? `${othersLabel} needs ${l.needGrade.toFixed(2)} or better`
                              : `${othersLabel} must average ${l.needed.toFixed(2)} or better`)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {notCounted > 0 && (
                <p className="text-xs text-slate-400">
                  {notCounted} {notCounted === 1 ? 'course isn' : 'courses aren'}'t included
                  because of missing work or a missing grade scale.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}