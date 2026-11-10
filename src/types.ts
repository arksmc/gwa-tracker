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

export type Course = {
  id: string
  code: string
  units: number
  locked?: boolean
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