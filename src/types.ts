export type Assessment = {
  id: string
  name: string
  score: number | null
  total: number
}

export type CombineMode = 'points' | 'equal'

export type GradeComponent = {
  id: string
  name: string
  weight: number
  mode?: CombineMode
  subcomponents: GradeComponent[]
  assessments: Assessment[]
}

export type Bracket = {
  id: string
  min: number
  max: number
  grade: string
}

export type CourseStatus = 'active' | 'complete' | 'inc' | 'drp'

// Must-pass rule: this top-level component needs at least minPercent,
// otherwise the course fails no matter the combined percentage.
export type PassRule = {
  componentId: string
  minPercent: number
}

export type Course = {
  id: string
  code: string
  units: number
  status: CourseStatus
  capAt100: boolean // extra credit: false lets the percentage exceed 100
  passRules?: PassRule[]
  root: GradeComponent
  brackets: Bracket[]
}

export type Semester = {
  id: string
  name: string
  targetGwa?: number
  courses: Course[]
}

export type GradeResult =
  | { status: 'unconfigured' }
  | { status: 'outside' }
  | { status: 'ok'; grade: string }

// Past years
export type PastCourse = {
  id: string
  name: string
  units: number
  grade: number | null
}

export type PastTerm = {
  id: string
  name: string
  entry:
    | { kind: 'quick'; units: number; gwa: number | null }
    | { kind: 'courses'; courses: PastCourse[] }
}

export type Profile = {
  name: string
  school: string
  defaultBrackets: Bracket[]
}

// Everything that gets saved, exported, and imported
export type AppData = {
  version: number
  semesters: Semester[]
  activeId: string | null
  pastTerms: PastTerm[]
  profile: Profile
}