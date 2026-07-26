import { openDB, type IDBPDatabase } from 'idb'

// ===== localStorage helpers =====
const KEY_PREFIX = 'topo-eval-'

export const STORAGE_KEYS = {
  VIEWER_SETTINGS: `${KEY_PREFIX}viewer-settings`,
  UI_STATE: `${KEY_PREFIX}ui-state`,
  RECENT_MODELS: `${KEY_PREFIX}recent-models`,
} as const

export function getItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.warn(`Failed to write to localStorage key="${key}":`, e)
  }
}

export function removeItem(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch (e) {
    console.warn(`Failed to remove localStorage key="${key}":`, e)
  }
}

// ===== IndexedDB scaffold =====
let dbPromise: Promise<IDBPDatabase> | null = null

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB('topo-eval-results', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('evaluations')) {
          const store = db.createObjectStore('evaluations', { keyPath: 'id' })
          store.createIndex('byModelId', 'modelId')
          store.createIndex('byCreatedAt', 'createdAt')
        }
      },
    })
  }
  return dbPromise
}

export async function addEvaluation(evaluation: Record<string, unknown>): Promise<void> {
  const db = await getDB()
  await db.add('evaluations', evaluation)
}

export async function getEvaluation(id: string): Promise<Record<string, unknown> | undefined> {
  const db = await getDB()
  return db.get('evaluations', id)
}

export async function getAllEvaluations(): Promise<Record<string, unknown>[]> {
  const db = await getDB()
  return db.getAll('evaluations')
}

export async function deleteEvaluation(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('evaluations', id)
}
