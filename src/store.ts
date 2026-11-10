import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppData, Course, GradeComponent, PastTerm, Profile, Semester } from './types'
import { DATA_VERSION, emptyData, migrateData } from './lib/migrate'
import { useUndo } from './lib/undo'

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
  undoable: (label: string, componentId: string, run: () => void) => void

  addPastTerm: (name: string) => void
  updatePastTerm: (id: string, fn: (t: PastTerm) => PastTerm) => void
  removePastTerm: (id: string) => void

  updateProfile: (patch: Partial<Profile>) => void
  replaceAll: (data: AppData) => void
  mergeData: (data: AppData) => { addedSemesters: number; addedPastTerms: number }
}

const hasComponent = (node: GradeComponent, id: string): boolean =>
  node.id === id || node.subcomponents.some((s) => hasComponent(s, id))

function insertAt<T>(list: T[], index: number, item: T): T[] {
  const copy = [...list]
  copy.splice(Math.min(index, copy.length), 0, item)
  return copy
}

const d = emptyData()

export const useStore = create<State>()(
  persist(
    (set, get) => ({
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

      removeSemester: (id) => {
        const s = get()
        const index = s.semesters.findIndex((x) => x.id === id)
        if (index < 0) return
        const removed = s.semesters[index]
        set((st) => {
          const semesters = st.semesters.filter((x) => x.id !== id)
          const activeId = st.activeId === id ? (semesters[0]?.id ?? null) : st.activeId
          return { semesters, activeId }
        })
        useUndo.getState().show(`Deleted folder "${removed.name}"`, () =>
          set((st) =>
            st.semesters.some((x) => x.id === removed.id)
              ? st
              : { semesters: insertAt(st.semesters, index, removed), activeId: removed.id }
          )
        )
      },

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

      removeCourse: (id) => {
        const s = get()
        const sem = s.semesters.find((x) => x.id === s.activeId)
        const index = sem ? sem.courses.findIndex((c) => c.id === id) : -1
        if (!sem || index < 0) return
        const removed = sem.courses[index]
        const semId = sem.id
        set((st) => ({
          semesters: st.semesters.map((x) =>
            x.id !== semId ? x : { ...x, courses: x.courses.filter((c) => c.id !== id) }
          ),
        }))
        useUndo.getState().show(`Deleted course "${removed.code}"`, () =>
          set((st) => ({
            semesters: st.semesters.map((x) =>
              x.id !== semId || x.courses.some((c) => c.id === removed.id)
                ? x
                : { ...x, courses: insertAt(x.courses, index, removed) }
            ),
          }))
        )
      },

      updateCourse: (id, fn) =>
        set((s) => ({
          semesters: s.semesters.map((sem) =>
            sem.id !== s.activeId
              ? sem
              : { ...sem, courses: sem.courses.map((c) => (c.id === id ? fn(c) : c)) }
          ),
        })),

      // Saves a copy of the course containing the component, runs the delete,
      // then offers an undo that puts the whole course back as it was.
      undoable: (label, componentId, run) => {
        const s = get()
        const sem = s.semesters.find((x) => x.id === s.activeId)
        const before = sem?.courses.find((c) => hasComponent(c.root, componentId))
        run()
        if (!sem || !before) return
        const semId = sem.id
        useUndo.getState().show(label, () =>
          set((st) => ({
            semesters: st.semesters.map((x) =>
              x.id !== semId
                ? x
                : {
                    ...x,
                    courses: x.courses.map((c) => (c.id === before.id ? before : c)),
                  }
            ),
          }))
        )
      },

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

      mergeData: (data) => {
        const clean = migrateData(data)
        const s = get()
        const semIds = new Set(s.semesters.map((x) => x.id))
        const pastIds = new Set(s.pastTerms.map((x) => x.id))
        const newSems = clean.semesters.filter((x) => !semIds.has(x.id))
        const newPast = clean.pastTerms.filter((x) => !pastIds.has(x.id))
        set({
          semesters: [...s.semesters, ...newSems],
          pastTerms: [...s.pastTerms, ...newPast],
          activeId: s.activeId ?? newSems[0]?.id ?? null,
          // keep the current profile, only fill gaps from the backup
          profile: {
            name: s.profile.name || clean.profile.name,
            school: s.profile.school || clean.profile.school,
            defaultBrackets: s.profile.defaultBrackets.length
              ? s.profile.defaultBrackets
              : clean.profile.defaultBrackets,
          },
        })
        return { addedSemesters: newSems.length, addedPastTerms: newPast.length }
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