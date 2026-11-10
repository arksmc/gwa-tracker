import { useState } from 'react'
import { ArrowLeft, ChevronDown, ChevronRight, Lock, Pencil, Unlock } from 'lucide-react'
import { componentPercent, courseGrade, describeGrade, leaves } from '../lib/grading'
import type { GradeComponent, Course } from '../types'
import { mapComponent, removeComponent } from '../lib/tree'
import { useStore } from '../store'
import ComponentNode from './ComponentNode'
import BracketEditor from './BracketEditor'
import TargetPanel from './TargetPanel'
import NumInput from './NumInput'

type Props = {
  course: Course
  onBack: () => void
}

export default function CourseDetail({ course, onBack }: Props) {
  const updateCourse = useStore((s) => s.updateCourse)
  const [editingUnits, setEditingUnits] = useState(false)
  const [scaleOpen, setScaleOpen] = useState(course.brackets.length === 0)

  const percent = componentPercent(course.root)
  const pendingCount = leaves(course.root).filter((l) => l.score === null).length
  const result = courseGrade(course)

  const edit = (id: string, fn: (c: GradeComponent) => GradeComponent) =>
    updateCourse(course.id, (c) => ({ ...c, root: mapComponent(c.root, id, fn) }))

  const remove = (id: string) =>
    updateCourse(course.id, (c) => ({ ...c, root: removeComponent(c.root, id) }))

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 pb-16">
      <header className="sticky top-0 z-10 -mx-4 bg-slate-50/90 px-4 py-4 backdrop-blur">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-slate-600"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="mt-2 flex items-end justify-between gap-4">
          <div>
            <p className="text-xl font-semibold">{course.code}</p>
            {editingUnits ? (
              <div className="flex items-center gap-1 text-sm text-slate-500">
                <NumInput
                  value={course.units}
                  onChange={(v) => updateCourse(course.id, (c) => ({ ...c, units: v }))}
                  className="w-12 rounded border border-slate-300 bg-white px-1 py-0.5 text-center"
                />
                <span>units</span>
                <button
                  onClick={() => setEditingUnits(false)}
                  className="ml-1 text-xs font-medium text-slate-700"
                >
                  Done
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingUnits(true)}
                className="flex items-center gap-1 text-sm text-slate-500"
              >
                {course.units} {course.units === 1 ? 'unit' : 'units'}
                <Pencil size={12} className="text-slate-400" />
              </button>
            )}
          </div>
          <div className="text-right">
  <p className="text-2xl font-bold">
    {percent === null ? 'No grade yet' : `${percent.toFixed(2)}%`}
  </p>
  <p className="text-sm text-slate-600">{describeGrade(result)}</p>
  <button
  onClick={() =>
    updateCourse(course.id, (c) => ({
      ...c,
      status: c.status === 'complete' ? 'active' : 'complete',
    }))
  }
  className={`mt-1 inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs ${
    course.status === 'complete'
      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
      : 'border-slate-300 text-slate-600'
  }`}
>
  {course.status === 'complete' ? <Lock size={12} /> : <Unlock size={12} />}
  {course.status === 'complete' ? 'Complete' : 'Mark as complete'}
</button>
{course.status === 'complete' && pendingCount > 0 && (
  <p className="mt-1 text-xs text-amber-700">
    {pendingCount} not-taken {pendingCount === 1 ? 'item' : 'items'} won't count
  </p>
)}
</div>
        </div>
      </header>

      <section className="mt-4">
        <ComponentNode node={course.root} depth={0} edit={edit} remove={remove} />
      </section>

      <TargetPanel course={course} />

      <section className="mt-10">
        <button
          onClick={() => setScaleOpen(!scaleOpen)}
          className="flex w-full items-center gap-1 text-sm font-medium uppercase tracking-wide text-slate-500"
        >
          {scaleOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          Grade scale
        </button>
        {scaleOpen && (
          <div className="mt-3">
            <BracketEditor
              brackets={course.brackets}
              onChange={(brackets) =>
                updateCourse(course.id, (c) => ({ ...c, brackets }))
              }
            />
          </div>
        )}
      </section>
    </div>
  )
}