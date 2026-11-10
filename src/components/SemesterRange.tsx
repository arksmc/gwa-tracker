import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { Course } from '../types'
import { computeGwa, rangeSkipText, semesterRange } from '../lib/grading'

type Props = {
  courses: Course[]
}

export default function SemesterRange({ courses }: Props) {
  const [open, setOpen] = useState(false)

  if (courses.length === 0) return null

  const range = semesterRange(courses)
  const shown = range.rows.filter((r) => r.skip === null)
  const skipped = range.rows.filter((r) => r.skip !== null)
  const nowGwa = computeGwa(courses)

  return (
    <section className="mt-8">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1 text-sm font-medium uppercase tracking-wide text-slate-500"
      >
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        Best and worst case
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {shown.length === 0 ? (
            <p className="text-sm text-slate-500">
              Add work to your courses and set their grade scales to see the range.
            </p>
          ) : (
            <div className="overflow-x-auto rounded border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                    <th className="px-3 py-2 font-medium">Course</th>
                    <th className="px-3 py-2 font-medium">Now</th>
                    <th className="px-3 py-2 font-medium">Best</th>
                    <th className="px-3 py-2 font-medium">Worst</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => (
                    <tr key={r.course.id} className="border-b border-slate-50">
                      <td className="px-3 py-2">
                        {r.course.code}
                        {r.locked && (
                          <span className="ml-2 rounded-full bg-emerald-50 px-1.5 text-xs text-emerald-700">
                            locked
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">{r.now ?? '—'}</td>
                      <td className="px-3 py-2">{r.best}</td>
                      <td className="px-3 py-2">{r.worst}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <td className="px-3 py-2">Semester</td>
                    <td className="px-3 py-2">
                      {nowGwa === null ? '—' : nowGwa.toFixed(2)}
                    </td>
                    <td className="px-3 py-2">
                      {range.bestGwa === null ? '—' : range.bestGwa.toFixed(2)}
                    </td>
                    <td className="px-3 py-2">
                      {range.worstGwa === null ? '—' : range.worstGwa.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {skipped.length > 0 && (
            <p className="text-xs text-slate-500">
              Not included:{' '}
              {skipped
                .map((r) => `${r.course.code} (${rangeSkipText[r.skip!]})`)
                .join(', ')}
            </p>
          )}

          <p className="text-xs text-slate-400">
            Best case assumes full marks on everything you haven't taken yet, and worst
            case assumes zero. Only work you've added counts, and a course with no scores
            yet can land anywhere on its scale.
          </p>
        </div>
      )}
    </section>
  )
}