import type { AppData } from '../types'
import { DATA_VERSION, migrateData } from './migrate'

const LAST_BACKUP_KEY = 'gwa-tracker-last-backup'
const MAX_FILE_BYTES = 5 * 1024 * 1024

export function downloadBackup(data: Omit<AppData, 'version'>): void {
  const payload: AppData = { ...data, version: DATA_VERSION }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `gwa-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  try {
    localStorage.setItem(LAST_BACKUP_KEY, String(Date.now()))
  } catch {
    /* storage unavailable; the reminder just keeps showing */
  }
}

export function lastBackupAt(): number | null {
  try {
    const v = localStorage.getItem(LAST_BACKUP_KEY)
    return v ? Number(v) : null
  } catch {
    return null
  }
}

export async function readBackupFile(file: File): Promise<AppData> {
  if (file.size > MAX_FILE_BYTES) throw new Error('That file is too large to be a backup.')
  const text = await file.text()
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('That file is not a valid backup (could not read it as JSON).')
  }
  return migrateData(raw) // throws a friendly error if it isn't GWA Tracker data
}

export function describeData(d: AppData): string {
  const courses = d.semesters.reduce((n, s) => n + s.courses.length, 0)
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
  const parts = [plural(d.semesters.length, 'semester'), plural(courses, 'course')]
  if (d.pastTerms.length > 0) parts.push(plural(d.pastTerms.length, 'past term'))
  return parts.join(', ')
}