import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppData, Course, PastTerm, Profile, Semester } from './types'
import { DATA_VERSION, emptyData, migrateData } from './lib/migrate'

type State = {
  semesters: Semester[]
  activeId: string | null
  pastTerms: PastTerm[]
  profile: Profile

  addSemester: (name: string) => void
  removeSemester: (id: string) => void
  setActive: (id: string) => void
  setTargetGwa: (id: string, value: number | null) => void

  addCourse: (code: string, units: number) => void
  removeCourse: (id: string) => void
  updateCourse: (id: string, fn: (c: Course) => Course) => void

  addPastTerm: (name: string) => void
  updatePastTerm: (id: string, fn: (t: PastTerm) => PastTerm) => void
  removePastTerm: (id: string) => void

  updateProfile: (patch: Partial<Profile>) => void
  replaceAll: (data: AppData) => void // used by import and undo
}

const d = emptyData()

export const useStore = create<State>()(
  persist(
    (set) => ({
      semesters: d.semesters,
      activeId: d.activeId,
      pastTerms: d.pastTerms,
      profile: d.profile,

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
          const activeId = s.activeId === id ? (semesters[0]?.id ?? null) : s.activeId
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
                      status: 'active',
                      capAt100: true,
                      // new courses start with the profile's default scale
                      brackets: s.profile.defaultBrackets.map((b) => ({
                        ...b,
                        id: crypto.randomUUID(),
                      })),
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
              : { ...sem, courses: sem.courses.map((c) => (c.id === id ? fn(c) : c)) }
          ),
        })),

      addPastTerm: (name) =>
        set((s) => ({
          pastTerms: [
            ...s.pastTerms,
            {
              id: crypto.randomUUID(),
              name,
              entry: { kind: 'quick', units: 0, gwa: null },
            },
          ],
        })),
      updatePastTerm: (id, fn) =>
        set((s) => ({ pastTerms: s.pastTerms.map((t) => (t.id === id ? fn(t) : t)) })),
      removePastTerm: (id) =>
        set((s) => ({ pastTerms: s.pastTerms.filter((t) => t.id !== id) })),

      updateProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),

      replaceAll: (data) => {
        const clean = migrateData(data)
        set({
          semesters: clean.semesters,
          activeId: clean.activeId,
          pastTerms: clean.pastTerms,
          profile: clean.profile,
        })
      },
    }),
    {
      name: 'gwa-tracker-v3', // same key, so existing data is migrated, not lost
      version: DATA_VERSION,
      // old data has no version (treated as 0); migrateData handles both
      migrate: (persisted) => migrateData(persisted) as unknown as State,
    }
  )
)