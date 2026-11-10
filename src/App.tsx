import { useState } from 'react'
import { useStore } from './store'
import { Menu, X } from 'lucide-react'
import {
  componentPercent,
  computeGwa,
  courseGrade,
  semesterSummary,
  skipReasonText,
} from './lib/grading'
import CourseDetail from './components/CourseDetail'
import SemesterRange from './components/SemesterRange'
import SemesterTarget from './components/SemesterTarget'

export default function App() {
  const semesters = useStore((s) => s.semesters)
  const activeId = useStore((s) => s.activeId)
  const addSemester = useStore((s) => s.addSemester)
  const removeSemester = useStore((s) => s.removeSemester)
  const setActive = useStore((s) => s.setActive)
  const addCourse = useStore((s) => s.addCourse)
  const removeCourse = useStore((s) => s.removeCourse)
  const setTargetGwa = useStore((s) => s.setTargetGwa)

  const [menuOpen, setMenuOpen] = useState(false)
  const [semName, setSemName] = useState('')
  const [code, setCode] = useState('')
  const [units, setUnits] = useState('3')
  const [openId, setOpenId] = useState<string | null>(null)

  const active = semesters.find((s) => s.id === activeId) ?? null
  const summary = active ? semesterSummary(active.courses) : null
  const openCourse = active?.courses.find((c) => c.id === openId) ?? null

  if (openCourse) {
    return <CourseDetail course={openCourse} onBack={() => setOpenId(null)} />
  }

  function submitSemester(e: React.FormEvent) {
    e.preventDefault()
    if (!semName.trim()) return
    addSemester(semName.trim())
    setSemName('')
    setMenuOpen(false)
  }

  function submitCourse(e: React.FormEvent) {
    e.preventDefault()
    const u = parseFloat(units)
    if (!code.trim() || Number.isNaN(u) || u <= 0) return
    addCourse(code.trim(), u)
    setCode('')
  }

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 pb-16">
      <header className="sticky top-0 z-10 -mx-4 flex items-start gap-3 bg-slate-50/90 px-4 py-4 backdrop-blur">
  <button
  onClick={() => setMenuOpen(true)}
  aria-label="Open folders"
  className="rounded-lg border border-slate-300 bg-white p-2"
>
  <Menu size={20} />
</button>
  <div className="min-w-0">
    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
      {active ? active.name : 'No folder open'}
    </p>
    <p className="text-3xl font-bold">
      {summary === null || summary.gwa === null ? '—' : summary.gwa.toFixed(2)}
    </p>
    {active && summary && active.courses.length > 0 && (
      <p className="text-xs text-slate-500">
        {summary.gwa === null
          ? 'No GWA yet'
          : `Based on ${summary.counted.length} of ${active.courses.length} courses · ${Number(summary.countedUnits.toFixed(2))} of ${Number(summary.totalUnits.toFixed(2))} units`}
      </p>
    )}
  </div>
</header>

      {menuOpen && (
        <div className="fixed inset-0 z-20 flex">
          <aside className="w-72 max-w-[85%] overflow-y-auto bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-semibold">Folders</p>
              <button onClick={() => setMenuOpen(false)} className="text-slate-500">
  <X size={18} />
</button>
            </div>

            {semesters.length === 0 && (
              <p className="mb-4 text-sm text-slate-500">No folders yet.</p>
            )}

            <ul className="mb-4 space-y-2">
              {semesters.map((sem) => {
  const g = computeGwa(sem.courses)
  return (
    <li key={sem.id} className="flex items-center gap-2">
      <button
        onClick={() => {
          setActive(sem.id)
          setMenuOpen(false)
        }}
        className={`flex-1 rounded-lg border px-3 py-2 text-left ${
          sem.id === activeId ? 'border-slate-900 bg-slate-100' : 'border-slate-200'
        }`}
      >
        <span className="block">{sem.name}</span>
        <span className="block text-xs text-slate-500">
          {g === null ? 'No GWA yet' : `GWA ${g.toFixed(2)}`}
        </span>
      </button>
      <button
        onClick={() => removeSemester(sem.id)}
        className="text-sm text-slate-400 hover:text-red-600"
      >
        Delete
      </button>
    </li>
  )
})}
            </ul>

            <form onSubmit={submitSemester} className="flex gap-2">
              <input
                value={semName}
                onChange={(e) => setSemName(e.target.value)}
                placeholder="New folder (e.g. 1st Sem)"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2"
              />
              <button className="rounded-lg bg-slate-900 px-3 py-2 text-white">
                Add
              </button>
            </form>
          </aside>
          <div className="flex-1 bg-black/30" onClick={() => setMenuOpen(false)} />
        </div>
      )}

      {!active && (
        <div className="mt-16 text-center text-slate-500">
          <p className="mb-4">Nothing here yet.</p>
          <button
            onClick={() => setMenuOpen(true)}
            className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white"
          >
            Create your first folder
          </button>
        </div>
      )}

      {active && (
        <>
          <form onSubmit={submitCourse} className="mt-2 flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Course code (e.g. CMSC 22)"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2"
            />
            <input
              value={units}
              onChange={(e) => setUnits(e.target.value)}
              inputMode="decimal"
              className="w-16 rounded-lg border border-slate-300 bg-white px-3 py-2 text-center"
            />
            <button className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white">
              Add
            </button>
          </form>
{summary && summary.skipped.length > 0 && (
  <p className="mt-3 text-xs text-slate-500">
    Not counted:{' '}
    {summary.skipped
      .map((s) => `${s.course.code} (${skipReasonText[s.reason]})`)
      .join(', ')}
  </p>
)}

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {active.courses.length === 0 && (
              <p className="text-slate-500 md:col-span-2">
                This folder is empty. Add a course above.
              </p>
            )}
            {active.courses.map((course) => {
              const percent = componentPercent(course.root)
              const result = courseGrade(course)
              return (
                <div
                  key={course.id}
                  onClick={() => setOpenId(course.id)}
                  className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-lg font-semibold">{course.code}</p>
                      <p className="text-sm text-slate-500">{course.units} units</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeCourse(course.id)
                      }}
                      className="text-sm text-slate-400 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <p className="text-2xl font-bold">
                      {percent === null ? 'No grade yet' : `${percent.toFixed(2)}%`}
                    </p>
                    <p className="text-sm text-slate-600">
                      {result?.status === 'unconfigured' && 'Scale not set'}
                      {result?.status === 'outside' && 'Outside scale'}
                      {result?.status === 'ok' && `Grade ${result.grade}`}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
          <SemesterTarget
  key={active.id}
  semester={active}
  onTargetChange={(v) => setTargetGwa(active.id, v)}
/>
<SemesterRange courses={active.courses} />
        </>
      )}
    </div>
  )
}