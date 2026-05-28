// Utilities for reading version-history snapshots stored on MarketplaceListing.contentSnapshot.
//
// Snapshot format (per version key):
//   New (v2): { meta: QuizMeta, questions: SnapshotQuestion[] }
//   Old (v1): SnapshotQuestion[]  ← plain array, backward compat
//
// parseSnapshots converts a raw JSON value to Record<versionKey, unknown>.
// getVersionedSnapshot reads one version entry and returns a typed VersionedSnapshot.

export interface QuizMeta {
  title: string
  description: string | null
  category: string | null
  language: string | null
  difficulty: string | null
}

export interface SnapshotQuestion {
  id: string
  quizId: string
  type: string
  text: string
  imageUrl: string | null
  correctAnswers: string[]
  order: number
  timeLimit: number
  useTimer: boolean
  points: number
  answerOptions: { id: string; questionId: string; text: string; isCorrect: boolean; translations: unknown }[]
  mapQuestion: {
    id: string; questionId: string; lat: number; lng: number
    rings: { id: string; mapQuestionId: string; radiusKm: number; points: number; order: number }[]
  } | null
  audioQuestion: { id: string; questionId: string; url: string; platform: string; embedUrl: string } | null
  rankingItems: { id: string; questionId: string; label: string; correctPosition: number; order: number; translations: unknown }[]
}

export interface VersionedSnapshot {
  meta: QuizMeta | null
  questions: SnapshotQuestion[]
}

// Extends VersionedSnapshot with an optional diffBaseline — the creator's full state at the
// time the buyer last did a partial accept. The diff endpoint uses this baseline so that
// rejected changes are permanently cleared and never reappear in future update prompts.
export interface CustomSnapshot extends VersionedSnapshot {
  diffBaseline?: VersionedSnapshot
}

export function parseSnapshots(raw: unknown): Record<string, unknown> {
  if (Array.isArray(raw)) return { '1': raw }
  if (raw && typeof raw === 'object') return raw as Record<string, unknown>
  return {}
}

export function parseCustomSnapshot(raw: unknown): CustomSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const obj = raw as { meta?: unknown; questions?: unknown; diffBaseline?: unknown }
  const qs = Array.isArray(obj.questions) ? (obj.questions as unknown[]) : null
  if (!qs || qs.length === 0) return null

  let diffBaseline: VersionedSnapshot | undefined
  if (obj.diffBaseline && typeof obj.diffBaseline === 'object' && !Array.isArray(obj.diffBaseline)) {
    const bl = obj.diffBaseline as { meta?: unknown; questions?: unknown }
    const blQs = Array.isArray(bl.questions) ? (bl.questions as unknown[]) : null
    if (blQs && blQs.length > 0) {
      diffBaseline = { meta: (bl.meta as QuizMeta) ?? null, questions: blQs as SnapshotQuestion[] }
    }
  }

  return {
    meta: (obj.meta as QuizMeta) ?? null,
    questions: qs as SnapshotQuestion[],
    diffBaseline,
  }
}

export function getVersionedSnapshot(contentSnapshot: unknown, version: number): VersionedSnapshot | null {
  const snapshots = parseSnapshots(contentSnapshot)
  const entry = snapshots[version.toString()]
  if (!entry) return null

  // New format: { meta: {...}, questions: [...] }
  if (entry && !Array.isArray(entry) && typeof entry === 'object') {
    const obj = entry as { meta?: unknown; questions?: unknown }
    const qs = Array.isArray(obj.questions) ? (obj.questions as unknown[]) : null
    if (!qs || qs.length === 0) return null
    const first = qs[0] as Record<string, unknown>
    if (typeof first?.timeLimit !== 'number') return null
    return {
      meta: (obj.meta as QuizMeta) ?? null,
      questions: qs as SnapshotQuestion[],
    }
  }

  // Old format: plain array of questions
  if (Array.isArray(entry) && entry.length > 0) {
    const first = (entry as unknown[])[0] as Record<string, unknown>
    if (typeof first?.timeLimit !== 'number') return null
    return { meta: null, questions: entry as SnapshotQuestion[] }
  }

  return null
}
