/**
 * In-browser stand-in for the backend database, used only by the MSW handlers.
 * Persisted to localStorage so data survives reloads and share links open in new tabs.
 */
import type { QuestionDto, StructureDto } from '@/api/types'
import { seedStructures } from './seed'

export interface StoredShare {
  shareId: string
  questionId: string
  createdAt: string
}

export interface StoredAnswer {
  answerId: string
  shareId: string
  optionId: string
  correct: boolean
  submittedAt: string
}

export interface MockDb {
  structures: StructureDto[]
  questions: Omit<QuestionDto, 'share'>[]
  shares: StoredShare[]
  answers: StoredAnswer[]
}

const STORAGE_KEY = 'open-civ-mock-db-v1'

function seed(): MockDb {
  return { structures: seedStructures(), questions: [], shares: [], answers: [] }
}

let db: MockDb | null = null

function storage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function getDb(): MockDb {
  if (db) return db
  try {
    const saved = storage()?.getItem(STORAGE_KEY)
    db = saved ? (JSON.parse(saved) as MockDb) : seed()
  } catch {
    db = seed()
  }
  return db
}

export function persist(): void {
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(getDb()))
  } catch {
    // Storage unavailable: data lives for this page only.
  }
}

/** Replaces the database (tests) — seeded by default. */
export function resetDb(next: MockDb = seed()): void {
  db = structuredClone(next)
  persist()
}

export function now(): string {
  return new Date().toISOString()
}

/** Server-generated identifiers. The frontend never invents these. */
export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`
}

const SHARE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function newShareId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return Array.from(bytes, (b) => SHARE_ALPHABET[b % SHARE_ALPHABET.length]).join('')
}
