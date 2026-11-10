import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Course, Semester } from './types'

type State = {
  semesters: Semester[]
  activeId: string | null
  addSemester: (name: string) => void
  removeSemester: (id: string) => void
  setActive: (id: string) => void
  addCourse: (code: string, units: number) => void
  removeCourse: (id: string) => void
  updateCourse: (id: string, fn: (c: Course) => Course) => void
  setTargetGwa: (id: string, value: number | null) => void
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      semesters: [],
      activeId: null,
      addSemester: (name) =>
        set((s) => {
          const id = crypto.randomUUID()
          return {
            semesters: [...s.semesters, { id, name, courses: [] }],
            activeId: id,
          }
        }),
      removeSemester: (id) =>
        set((s) => {
          const semesters = s.semesters.filter((x) => x.id !== id)
          const activeId =
            s.activeId === id ? (semesters[0]?.id ?? null) : s.activeId
          return { semesters, activeId }
        }),
      setActive: (id) => set({ activeId: id }),
      setTargetGwa: (id, value) =>
  set((s) => ({
    semesters: s.semesters.map((sem) =>
      sem.id !== id ? sem : { ...sem, targetGwa: value ?? undefined }
    ),
  })),
      addCourse: (code, units) =>
        set((s) => ({
          semesters: s.semesters.map((sem) =>
            sem.id !== s.activeId
              ? sem
              : {
                  ...sem,
                  courses: [
                    ...sem.courses,
                    {
                      id: crypto.randomUUID(),
                      code,
                      units,
                      brackets: [],
                      root: {
                        id: crypto.randomUUID(),
                        name: code,
                        weight: 100,
                        subcomponents: [],
                        assessments: [],
                      },
                    },
                  ],
                }
          ),
        })),
      removeCourse: (id) =>
        set((s) => ({
          semesters: s.semesters.map((sem) =>
            sem.id !== s.activeId
              ? sem
              : { ...sem, courses: sem.courses.filter((c) => c.id !== id) }
          ),
        })),
              updateCourse: (id, fn) =>
        set((s) => ({
          semesters: s.semesters.map((sem) =>
            sem.id !== s.activeId
              ? sem
              : {
                  ...sem,
                  courses: sem.courses.map((c) => (c.id === id ? fn(c) : c)),
                }
          ),
        })),
    }),
    { name: 'gwa-tracker-v3' }
  )
)