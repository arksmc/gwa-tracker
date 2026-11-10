import type { Bracket } from '../types'

export function validateBrackets(brackets: Bracket[]): string[] {
  const issues: string[] = []

  for (const b of brackets) {
    if (!b.grade.trim()) issues.push('A bracket is missing its grade.')
    if (b.min > b.max) {
      issues.push(`${b.grade || 'A bracket'}: min is higher than max.`)
    }
  }

  const sorted = brackets
    .filter((b) => b.min <= b.max)
    .sort((a, b) => a.min - b.min)

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const cur = sorted[i]
    if (cur.min <= prev.max) {
      issues.push(
        `Overlap: ${prev.grade} (${prev.min}–${prev.max}) and ${cur.grade} (${cur.min}–${cur.max}).`
      )
    } else if (cur.min - prev.max > 1) {
      issues.push(`Gap between ${prev.max} and ${cur.min}.`)
    }
  }

  return issues
}