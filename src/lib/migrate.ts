import type { AppData, Course, CourseStatus, PastTerm, Profile, Semester } from '../types'

export const DATA_VERSION = 1

export const emptyProfile = (): Profile => ({ name: '', school: '', defaultBrackets: [] })

export const emptyData = (): AppData => ({
  version: DATA_VERSION,
  semesters: [],
  activeId: null,
  pastTerms: [],
  profile: emptyProfile(),
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = Record<string, any>
const isObj = (v: unknown): v is Loose => typeof v === 'object' && v !== null && !Array.isArray(v)

const STATUSES: CourseStatus[] = ['active', 'complete', 'inc', 'drp']

function migrateCourse(raw: Loose): Course {
  // v0 used `locked: true` for completed courses
  const { locked, ...rest } = raw
  const status: CourseStatus = STATUSES.includes(rest.status)
    ? rest.status
    : locked === true
      ? 'complete'
      : 'active'
  return {
    ...rest,
    status,
    capAt100: rest.capAt100 !== false,
    brackets: Array.isArray(rest.brackets) ? rest.brackets : [],
  } as Course
}

function migrateSemester(raw: Loose): Semester {
  return {
    ...raw,
    courses: Array.isArray(raw.courses) ? raw.courses.filter(isObj).map(migrateCourse) : [],
  } as Semester
}

/**
 * Accepts anything (old localStorage data, an imported file) and returns
 * valid current-version AppData. Safe to run on already-current data.
 * Throws if the input is clearly not GWA tracker data.
 */
export function migrateData(raw: unknown): AppData {
  if (!isObj(raw) || !Array.isArray(raw.semesters)) {
    throw new Error('This does not look like GWA Tracker data.')
  }
  const semesters = raw.semesters.filter(isObj).map(migrateSemester)
  const activeId =
    typeof raw.activeId === 'string' && semesters.some((s) => s.id === raw.activeId)
      ? raw.activeId
      : (semesters[0]?.id ?? null)

  return {
    version: DATA_VERSION,
    semesters,
    activeId,
    pastTerms: Array.isArray(raw.pastTerms) ? (raw.pastTerms as PastTerm[]) : [],
    profile: isObj(raw.profile)
      ? { ...emptyProfile(), ...(raw.profile as Partial<Profile>) }
      : emptyProfile(),
  }
}