import type { GradeComponent, Course, GradeResult, Bracket } from '../types'

export type Leaf = {
  id: string
  name: string
  group: string
  weight: number
  total: number
  score: number | null
}

export const MAX_PERCENT = 100

export function leaves(node: GradeComponent, trail: string[] = []): Leaf[] {
  if (node.subcomponents.length > 0) {
    return node.subcomponents.flatMap((s) => leaves(s, [...trail, s.name]))
  }
  const valid = node.assessments.filter((a) => a.total > 0)
  if (valid.length === 0 || node.weight <= 0) return []
  const mode = node.mode ?? 'points'
  const pool = valid.reduce((acc, a) => acc + a.total, 0)
  return valid.map((a) => ({
    id: a.id,
    name: a.name,
    group: trail[trail.length - 1] ?? '',
    total: a.total,
    score: a.score,
    weight:
      mode === 'equal' ? node.weight / valid.length : (node.weight * a.total) / pool,
  }))
}

export function projectedPercent(
  ls: Leaf[],
  solveIds: Set<string>,
  assume: number,
  x: number
): number {
  let earned = 0
  let total = 0
  for (const l of ls) {
    total += l.weight
    if (l.score !== null) earned += (l.weight * l.score) / l.total
    else if (solveIds.has(l.id)) earned += (l.weight * x) / 100
    else earned += (l.weight * assume) / 100
  }
  if (total <= 0) return 0
  return (earned / total) * 100
}

export function tally(ls: Leaf[]) {
  let earned = 0
  let scored = 0
  let pending = 0
  for (const l of ls) {
    if (l.score === null) {
      pending += l.weight
    } else {
      scored += l.weight
      earned += (l.weight * l.score) / l.total
    }
  }
  return { earned, scored, pending }
}

export function componentPercent(node: GradeComponent): number | null {
  const t = tally(leaves(node))
  if (t.scored <= 0) return null
  return (t.earned / t.scored) * 100
}

export function neededPercent(
  ls: Leaf[],
  solveIds: Set<string>,
  assume: number,
  target: number
): number | null {
  let earned = 0
  let total = 0
  let solve = 0
  let assumed = 0
  for (const l of ls) {
    total += l.weight
    if (l.score !== null) earned += (l.weight * l.score) / l.total
    else if (solveIds.has(l.id)) solve += l.weight
    else assumed += l.weight
  }
  if (solve <= 0) return null
  const goal = (target / 100) * total
  return ((goal - earned - (assumed * assume) / 100) / solve) * 100
}

export function rawNeeded(percent: number, total: number): number {
  return Math.ceil((percent / 100) * total - 1e-9)
}

export function gradeFromPercent(percent: number, brackets: Bracket[]): GradeResult {
  const valid = brackets.filter((b) => b.grade.trim() !== '' && b.min <= b.max)
  if (valid.length === 0) return { status: 'unconfigured' }
  const sorted = [...valid].sort((a, b) => b.min - a.min)
  const topMax = Math.max(...valid.map((b) => b.max))
  const hit = sorted.find((b) => percent >= b.min)
  if (!hit || percent > topMax) return { status: 'outside' }
  return { status: 'ok', grade: hit.grade }
}

export function courseGrade(course: Course): GradeResult | null {
  const percent = componentPercent(course.root)
  if (percent === null) return null
  return gradeFromPercent(percent, course.brackets)
}

export function describeGrade(result: GradeResult | null): string {
  if (result === null) return ''
  if (result.status === 'unconfigured') return 'Scale not set'
  if (result.status === 'outside') return 'Outside scale'
  return `Grade ${result.grade}`
}

export type SkipReason = 'no-scores' | 'no-scale' | 'outside-scale' | 'not-numeric'

export const skipReasonText: Record<SkipReason, string> = {
  'no-scores': 'no scores yet',
  'no-scale': 'scale not set',
  'outside-scale': 'outside scale',
  'not-numeric': 'no numeric grade',
}

export type SemesterSummary = {
  gwa: number | null
  counted: Course[]
  countedUnits: number
  totalUnits: number
  skipped: { course: Course; reason: SkipReason }[]
}

export function semesterSummary(courses: Course[]): SemesterSummary {
  let points = 0
  let countedUnits = 0
  let totalUnits = 0
  const counted: Course[] = []
  const skipped: SemesterSummary['skipped'] = []

  for (const course of courses) {
    totalUnits += course.units
    const result = courseGrade(course)
    if (result === null) {
      skipped.push({ course, reason: 'no-scores' })
      continue
    }
    if (result.status === 'unconfigured') {
      skipped.push({ course, reason: 'no-scale' })
      continue
    }
    if (result.status === 'outside') {
      skipped.push({ course, reason: 'outside-scale' })
      continue
    }
    const value = parseFloat(result.grade)
    if (Number.isNaN(value)) {
      skipped.push({ course, reason: 'not-numeric' })
      continue
    }
    points += value * course.units
    countedUnits += course.units
    counted.push(course)
  }

  return {
    gwa: countedUnits > 0 ? points / countedUnits : null,
    counted,
    countedUnits,
    totalUnits,
    skipped,
  }
}

export function computeGwa(courses: Course[]): number | null {
  return semesterSummary(courses).gwa
}

export type RangeSkip =
  | 'no-items'
  | 'no-scores'
  | 'no-scale'
  | 'outside-scale'
  | 'not-numeric'

export const rangeSkipText: Record<RangeSkip, string> = {
  'no-items': 'no work added yet',
  'no-scores': 'no scores yet',
  'no-scale': 'scale not set',
  'outside-scale': 'outside scale',
  'not-numeric': 'no numeric grade',
}

export type CourseRange = {
  course: Course
  now: string | null
  best: string | null
  worst: string | null
  bestValue: number | null
  worstValue: number | null
  locked: boolean
  skip: RangeSkip | null
}

export function courseRange(course: Course): CourseRange {
  const ls = leaves(course.root)
  const nowResult = courseGrade(course)
  const now = nowResult?.status === 'ok' ? nowResult.grade : null
  const empty = {
    course,
    now,
    best: null,
    worst: null,
    bestValue: null,
    worstValue: null,
    locked: false,
  }

  if (course.locked) {
  if (nowResult === null) return { ...empty, skip: 'no-scores' }
  if (nowResult.status === 'unconfigured') return { ...empty, skip: 'no-scale' }
  if (nowResult.status === 'outside') return { ...empty, skip: 'outside-scale' }
  const value = parseFloat(nowResult.grade)
  if (Number.isNaN(value)) return { ...empty, skip: 'not-numeric' }
  return {
    course,
    now: nowResult.grade,
    best: nowResult.grade,
    worst: nowResult.grade,
    bestValue: value,
    worstValue: value,
    locked: true,
    skip: null,
  }
}

  if (ls.length === 0) return { ...empty, skip: 'no-items' }

  const pendingIds = new Set(ls.filter((l) => l.score === null).map((l) => l.id))
  const best = gradeFromPercent(
    projectedPercent(ls, pendingIds, 0, MAX_PERCENT),
    course.brackets
  )
  const worst = gradeFromPercent(projectedPercent(ls, pendingIds, 0, 0), course.brackets)

  if (best.status === 'unconfigured' || worst.status === 'unconfigured') {
    return { ...empty, skip: 'no-scale' }
  }
  if (best.status === 'outside' || worst.status === 'outside') {
    return { ...empty, skip: 'outside-scale' }
  }

  const bestValue = parseFloat(best.grade)
  const worstValue = parseFloat(worst.grade)
  if (Number.isNaN(bestValue) || Number.isNaN(worstValue)) {
    return { ...empty, skip: 'not-numeric' }
  }

  return {
    course,
    now,
    best: best.grade,
    worst: worst.grade,
    bestValue,
    worstValue,
    locked: course.locked === true,
    skip: null,
  }
}

export type SemesterRange = {
  rows: CourseRange[]
  bestGwa: number | null
  worstGwa: number | null
  includedUnits: number
  totalUnits: number
}

export function semesterRange(courses: Course[]): SemesterRange {
  const rows = courses.map(courseRange)
  let bestPoints = 0
  let worstPoints = 0
  let includedUnits = 0
  let totalUnits = 0

  for (const r of rows) {
    totalUnits += r.course.units
    if (r.skip !== null || r.bestValue === null || r.worstValue === null) continue
    bestPoints += r.bestValue * r.course.units
    worstPoints += r.worstValue * r.course.units
    includedUnits += r.course.units
  }

  return {
    rows,
    bestGwa: includedUnits > 0 ? bestPoints / includedUnits : null,
    worstGwa: includedUnits > 0 ? worstPoints / includedUnits : null,
    includedUnits,
    totalUnits,
  }
}

const EPS = 1e-9

export type TargetPlan = {
  status: 'no-courses' | 'secured' | 'unreachable' | 'open'
  fixedRows: CourseRange[]
  openRows: CourseRange[]
  fixedPoints: number
  totalUnits: number
  openUnits: number
  neededAverage: number | null
}

export function targetPlan(range: SemesterRange, target: number): TargetPlan {
  const included = range.rows.filter(
    (r) => r.skip === null && r.bestValue !== null && r.worstValue !== null
  )
  const fixedRows = included.filter((r) => r.bestValue === r.worstValue)
  const openRows = included.filter((r) => r.bestValue !== r.worstValue)
  const fixedPoints = fixedRows.reduce(
    (acc, r) => acc + (r.bestValue ?? 0) * r.course.units,
    0
  )
  const totalUnits = included.reduce((acc, r) => acc + r.course.units, 0)
  const openUnits = openRows.reduce((acc, r) => acc + r.course.units, 0)
  const base = { fixedRows, openRows, fixedPoints, totalUnits, openUnits }

  if (included.length === 0 || range.bestGwa === null || range.worstGwa === null) {
    return { ...base, status: 'no-courses', neededAverage: null }
  }
  if (range.worstGwa <= target + EPS) {
    return { ...base, status: 'secured', neededAverage: null }
  }
  if (range.bestGwa > target + EPS) {
    return { ...base, status: 'unreachable', neededAverage: null }
  }
  return {
    ...base,
    status: 'open',
    neededAverage: (target * totalUnits - fixedPoints) / openUnits,
  }
}

export type PriorityLine = {
  grade: number
  outcome: 'no' | 'any' | 'need'
  needed: number | null
  needGrade: number | null
}

export function priorityLines(
  plan: TargetPlan,
  target: number,
  priorityId: string
): PriorityLine[] {
  const priority = plan.openRows.find((r) => r.course.id === priorityId)
  if (!priority) return []
  const best = priority.bestValue
  const worst = priority.worstValue
  if (best === null || worst === null) return []

  const others = plan.openRows.filter((r) => r.course.id !== priorityId)
  const othersUnits = others.reduce((acc, r) => acc + r.course.units, 0)
  const othersBest = others.reduce(
    (acc, r) => acc + (r.bestValue ?? 0) * r.course.units,
    0
  )
  const othersWorst = others.reduce(
    (acc, r) => acc + (r.worstValue ?? 0) * r.course.units,
    0
  )
  const pu = priority.course.units

  const grades = Array.from(
    new Set(
      priority.course.brackets
        .map((b) => parseFloat(b.grade))
        .filter((g) => !Number.isNaN(g) && g >= best - EPS && g <= worst + EPS)
    )
  ).sort((a, b) => a - b)

  return grades.map((g): PriorityLine => {
    const budget = target * plan.totalUnits - plan.fixedPoints - g * pu
    if (othersUnits === 0) {
      return { grade: g, outcome: budget >= -EPS ? 'any' : 'no', needed: null, needGrade: null }
    }
    const needed = budget / othersUnits
    if (needed < othersBest / othersUnits - EPS) {
      return { grade: g, outcome: 'no', needed, needGrade: null }
    }
    if (needed >= othersWorst / othersUnits - EPS) {
      return { grade: g, outcome: 'any', needed, needGrade: null }
    }
    let needGrade: number | null = null
    if (others.length === 1) {
      const options = others[0].course.brackets
        .map((b) => parseFloat(b.grade))
        .filter((v) => !Number.isNaN(v) && v <= needed + EPS)
      if (options.length > 0) needGrade = Math.max(...options)
    }
    return { grade: g, outcome: 'need', needed, needGrade }
  })
}