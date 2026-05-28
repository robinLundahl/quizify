import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { MapContainer, TileLayer, Marker, Circle } from 'react-leaflet'
import L from 'leaflet'
import api from '../../lib/api'

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DiffQuestion {
  id: string; text: string; type: string
  timeLimit: number; points: number; useTimer: boolean; imageUrl: string | null
  answerOptions: { text: string; isCorrect: boolean }[]
  rankingItems?: { label: string; correctPosition: number }[]
  mapQuestion?: { lat: number; lng: number; rings: { radiusKm: number; points: number }[] } | null
  audioQuestion?: { url: string; platform: string } | null
}

export interface MetaChange { field: string; before: string | null; after: string | null }

export interface DiffResult {
  added: DiffQuestion[]
  removed: DiffQuestion[]
  modified: { id: string; before: DiffQuestion; after: DiffQuestion }[]
  metaChanges: MetaChange[]
}

interface ClaimUpdateBody {
  acceptAll?: boolean
  acceptedMetaFields?: string[]
  acceptedAddedIds?: string[]
  acceptedModifiedIds?: string[]
  acceptedRemovedIds?: string[]
}

interface Props {
  listingId: string
  title: string
  onClose: () => void
  onSuccess?: () => void
}

// ─── Mini map ─────────────────────────────────────────────────────────────────

function MiniMap({
  lat, lng, rings, borderClass = 'border-gray-200',
}: {
  lat: number; lng: number
  rings: { radiusKm: number; points: number }[]
  borderClass?: string
}) {
  return (
    <div className={`overflow-hidden rounded-xl border mt-2.5 ${borderClass}`} style={{ height: 140 }}>
      <MapContainer
        center={[lat, lng]} zoom={6}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false} dragging={false} zoomControl={false}
        doubleClickZoom={false} keyboard={false} touchZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {[...rings].sort((a, b) => b.radiusKm - a.radiusKm).map((r, i, arr) => {
          const colorIndex = arr.length - 1 - i
          const fillOpacity = arr.length === 1 ? 0.35 : 0.40 - (colorIndex / (arr.length - 1)) * 0.32
          return (
            <Circle key={i} center={[lat, lng]} radius={r.radiusKm * 1000}
              pathOptions={{ fillColor: '#dc2626', fillOpacity, color: '#dc2626', weight: 1.5, opacity: Math.min(fillOpacity + 0.25, 0.75) }}
            />
          )
        })}
        <Marker position={[lat, lng]} />
      </MapContainer>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function UpdateModal({ listingId, title, onClose, onSuccess }: Props) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [deselectedKeys, setDeselectedKeys] = useState<Set<string>>(new Set())

  const { data: diff, isLoading: diffLoading } = useQuery<DiffResult>({
    queryKey: ['listing-diff', listingId],
    queryFn: () => api.get(`/marketplace/${listingId}/diff`).then((r) => r.data),
    staleTime: Infinity,
  })

  const claimUpdate = useMutation({
    mutationFn: (body: ClaimUpdateBody) => api.post(`/marketplace/${listingId}/claim-update`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] })
      qc.invalidateQueries({ queryKey: ['listing-meta', listingId] })
      onSuccess?.()
      handleClose()
    },
  })

  function toggleDiffKey(key: string) {
    setDeselectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  function buildClaimBody(): ClaimUpdateBody {
    if (!diff || deselectedKeys.size === 0) return { acceptAll: true }
    return {
      acceptAll: false,
      acceptedMetaFields: diff.metaChanges.filter((c) => !deselectedKeys.has(`meta:${c.field}`)).map((c) => c.field),
      acceptedAddedIds:   diff.added.filter((q) => !deselectedKeys.has(`add:${q.id}`)).map((q) => q.id),
      acceptedModifiedIds:diff.modified.filter((m) => !deselectedKeys.has(`mod:${m.id}`)).map((m) => m.id),
      acceptedRemovedIds: diff.removed.filter((q) => !deselectedKeys.has(`rem:${q.id}`)).map((q) => q.id),
    }
  }

  function handleClose() {
    setDeselectedKeys(new Set())
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="p-5">
          {/* Title row */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">{t('marketplace.changelog_title', { defaultValue: "What's new" })}</h2>
              <p className="text-sm text-gray-400 mt-0.5">{title}</p>
            </div>
            <button
              onClick={handleClose}
              className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Summary pills + select/deselect */}
          {diff && (
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {diff.added.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />{diff.added.length} added
                  </span>
                )}
                {diff.modified.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />{diff.modified.length} modified
                  </span>
                )}
                {diff.removed.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-xs font-medium text-red-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400" />{diff.removed.length} removed
                  </span>
                )}
                {diff.metaChanges.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-xs font-medium text-indigo-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />{diff.metaChanges.length} detail{diff.metaChanges.length !== 1 ? 's' : ''} updated
                  </span>
                )}
              </div>
              <div className="flex gap-2 text-xs font-medium shrink-0">
                <button onClick={() => setDeselectedKeys(new Set())} className="text-indigo-600 hover:underline">
                  {t('common.select_all', { defaultValue: 'All' })}
                </button>
                <span className="text-gray-200">|</span>
                <button
                  onClick={() => setDeselectedKeys(new Set([
                    ...diff.metaChanges.map((c) => `meta:${c.field}`),
                    ...diff.added.map((q) => `add:${q.id}`),
                    ...diff.modified.map((m) => `mod:${m.id}`),
                    ...diff.removed.map((q) => `rem:${q.id}`),
                  ]))}
                  className="text-gray-400 hover:underline"
                >
                  {t('common.deselect_all', { defaultValue: 'None' })}
                </button>
              </div>
            </div>
          )}

          {/* Diff panel */}
          <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 max-h-[52vh] overflow-y-auto p-2.5 space-y-2">
            {diffLoading && (
              <div className="flex justify-center py-10">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-indigo-500" />
              </div>
            )}
            {diff && diff.added.length === 0 && diff.modified.length === 0 && diff.removed.length === 0 && diff.metaChanges.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-8">{t('marketplace.changelog_no_changes', { defaultValue: 'No changes detected.' })}</p>
            )}

            {/* Meta changes */}
            {diff?.metaChanges.map((c) => {
              const key = `meta:${c.field}`
              const checked = !deselectedKeys.has(key)
              return (
                <div key={c.field} onClick={() => toggleDiffKey(key)} className={`cursor-pointer rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden transition-all hover:shadow-md ${!checked ? 'opacity-40' : ''}`}>
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                    <input type="checkbox" checked={checked} readOnly className="accent-indigo-500" onClick={(e) => { e.stopPropagation(); toggleDiffKey(key) }} />
                    <div className="h-6 w-6 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                      <svg className="h-3 w-3 text-indigo-500" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1Zm0 3a.75.75 0 0 0-.75.75v3.5a.75.75 0 0 0 1.5 0v-3.5A.75.75 0 0 0 8 4Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
                      </svg>
                    </div>
                    <span className="text-sm font-semibold text-gray-700 capitalize">{c.field}</span>
                    <span className="ml-auto text-xs text-gray-400">detail updated</span>
                  </div>
                  <div className="flex items-stretch gap-3 px-4 py-3">
                    {c.before != null ? (
                      <div className="flex-1 rounded-xl bg-red-50 border border-red-100 px-3 py-2.5 min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-1">Before</p>
                        <p className="text-sm text-red-700 line-through">{c.before}</p>
                      </div>
                    ) : <div className="flex-1" />}
                    <div className="flex items-center">
                      <svg className="h-4 w-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                    {c.after != null ? (
                      <div className="flex-1 rounded-xl bg-green-50 border border-green-100 px-3 py-2.5 min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-green-500 mb-1">After</p>
                        <p className="text-sm text-green-700 font-semibold">{c.after}</p>
                      </div>
                    ) : <div className="flex-1" />}
                  </div>
                </div>
              )
            })}

            {/* Added questions */}
            {diff?.added.map((q) => {
              const key = `add:${q.id}`
              const checked = !deselectedKeys.has(key)
              return (
                <div key={q.id} onClick={() => toggleDiffKey(key)} className={`cursor-pointer rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden transition-all hover:shadow-md ${!checked ? 'opacity-40' : ''}`}>
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                    <input type="checkbox" checked={checked} readOnly className="accent-indigo-500" onClick={(e) => { e.stopPropagation(); toggleDiffKey(key) }} />
                    <div className="h-6 w-6 rounded-full bg-green-100 border border-green-200 flex items-center justify-center shrink-0">
                      <svg className="h-3 w-3 text-green-600" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
                      </svg>
                    </div>
                    <span className="text-sm font-semibold text-gray-700">New question</span>
                    <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{q.type.replace(/_/g, ' ').toLowerCase()}</span>
                  </div>
                  <div className="px-4 py-3.5">
                    <p className="text-sm font-semibold text-gray-800 leading-snug">{q.text}</p>
                    {q.answerOptions.length > 0 && (
                      <div className="mt-3 grid grid-cols-2 gap-1.5">
                        {q.answerOptions.map((opt, i) => (
                          <div key={i} className={`rounded-lg px-3 py-2 text-xs leading-snug ${opt.isCorrect ? 'bg-green-50 border border-green-200 text-green-700 font-semibold' : 'bg-gray-50 border border-gray-100 text-gray-500'}`}>
                            {opt.isCorrect && <span className="mr-1 text-green-500">✓</span>}{opt.text}
                          </div>
                        ))}
                      </div>
                    )}
                    {(q.rankingItems ?? []).length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {(q.rankingItems ?? []).map((r, i) => (
                          <div key={i} className="flex items-center gap-2.5 rounded-lg bg-gray-50 border border-gray-100 px-3 py-1.5 text-xs text-gray-600">
                            <span className="h-4 w-4 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0">{r.correctPosition}</span>
                            {r.label}
                          </div>
                        ))}
                      </div>
                    )}
                    {q.mapQuestion && (
                      <MiniMap lat={q.mapQuestion.lat} lng={q.mapQuestion.lng} rings={q.mapQuestion.rings} />
                    )}
                  </div>
                </div>
              )
            })}

            {/* Removed questions */}
            {diff?.removed.map((q) => {
              const key = `rem:${q.id}`
              const checked = !deselectedKeys.has(key)
              return (
                <div key={q.id} onClick={() => toggleDiffKey(key)} className={`cursor-pointer rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden transition-all hover:shadow-md ${!checked ? 'opacity-40' : ''}`}>
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                    <input type="checkbox" checked={checked} readOnly className="accent-indigo-500" onClick={(e) => { e.stopPropagation(); toggleDiffKey(key) }} />
                    <div className="h-6 w-6 rounded-full bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                      <svg className="h-3 w-3 text-red-500" fill="currentColor" viewBox="0 0 16 16">
                        <path fillRule="evenodd" d="M5.75 8.75a.75.75 0 0 0 0-1.5h-3a.75.75 0 0 0 0 1.5h3Zm8.5 0a.75.75 0 0 0 0-1.5h-3a.75.75 0 0 0 0 1.5h3Z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-sm font-semibold text-gray-700">Removed question</span>
                    <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-400">{q.type.replace(/_/g, ' ').toLowerCase()}</span>
                  </div>
                  <div className="px-4 py-3.5">
                    <p className="text-sm text-gray-500 line-through leading-snug">{q.text}</p>
                    {q.answerOptions.length > 0 && (
                      <div className="mt-3 grid grid-cols-2 gap-1.5">
                        {q.answerOptions.map((opt, i) => (
                          <div key={i} className="rounded-lg px-3 py-2 text-xs bg-gray-50 border border-gray-100 text-gray-400 line-through">{opt.text}</div>
                        ))}
                      </div>
                    )}
                    {q.mapQuestion && (
                      <MiniMap lat={q.mapQuestion.lat} lng={q.mapQuestion.lng} rings={q.mapQuestion.rings} />
                    )}
                  </div>
                </div>
              )
            })}

            {/* Modified questions */}
            {diff?.modified.map((m) => {
              const key = `mod:${m.id}`
              const checked = !deselectedKeys.has(key)
              return (
                <div key={m.id} onClick={() => toggleDiffKey(key)} className={`cursor-pointer rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden transition-all hover:shadow-md ${!checked ? 'opacity-40' : ''}`}>
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                    <input type="checkbox" checked={checked} readOnly className="accent-indigo-500" onClick={(e) => { e.stopPropagation(); toggleDiffKey(key) }} />
                    <div className="h-6 w-6 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                      <svg className="h-3 w-3 text-amber-500" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.263a1.75 1.75 0 0 0 0-2.474Z" />
                      </svg>
                    </div>
                    <span className="text-sm font-semibold text-gray-700">Modified question</span>
                    <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{m.after.type.replace(/_/g, ' ').toLowerCase()}</span>
                  </div>
                  <div className="p-3.5 space-y-2.5">
                    <div className="rounded-xl bg-red-50 border border-red-100 p-3.5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-2">Before</p>
                      <p className="text-sm text-gray-700 leading-snug">{m.before.text}</p>
                      {m.before.answerOptions.length > 0 && (
                        <div className="mt-2.5 grid grid-cols-2 gap-1.5">
                          {m.before.answerOptions.map((opt, i) => (
                            <div key={i} className={`rounded-lg px-2.5 py-1.5 text-xs leading-snug ${opt.isCorrect ? 'bg-red-100 border border-red-200 text-red-700 font-medium' : 'bg-white border border-red-100 text-red-400/70'}`}>
                              {opt.isCorrect && <span className="mr-1">✓</span>}{opt.text}
                            </div>
                          ))}
                        </div>
                      )}
                      {(m.before.rankingItems ?? []).length > 0 && (
                        <div className="mt-2.5 space-y-1.5">
                          {(m.before.rankingItems ?? []).map((r, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-red-500/70">
                              <span className="h-4 w-4 rounded-full bg-red-100 flex items-center justify-center text-[10px] font-bold text-red-400 shrink-0">{r.correctPosition}</span>
                              {r.label}
                            </div>
                          ))}
                        </div>
                      )}
                      {m.before.mapQuestion && (
                        <>
                          <MiniMap lat={m.before.mapQuestion.lat} lng={m.before.mapQuestion.lng} rings={m.before.mapQuestion.rings} borderClass="border-red-200" />
                          <p className="mt-1 text-[10px] text-red-400/70">{m.before.mapQuestion.lat.toFixed(4)}, {m.before.mapQuestion.lng.toFixed(4)}</p>
                        </>
                      )}
                    </div>
                    <div className="flex justify-center">
                      <div className="h-7 w-7 rounded-full border border-gray-200 bg-white flex items-center justify-center shadow-sm">
                        <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    <div className="rounded-xl bg-green-50 border border-green-100 p-3.5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-green-500 mb-2">After</p>
                      <p className="text-sm text-gray-700 font-medium leading-snug">{m.after.text}</p>
                      {m.after.answerOptions.length > 0 && (
                        <div className="mt-2.5 grid grid-cols-2 gap-1.5">
                          {m.after.answerOptions.map((opt, i) => (
                            <div key={i} className={`rounded-lg px-2.5 py-1.5 text-xs leading-snug ${opt.isCorrect ? 'bg-green-100 border border-green-200 text-green-700 font-semibold' : 'bg-white border border-green-100 text-green-600/60'}`}>
                              {opt.isCorrect && <span className="mr-1">✓</span>}{opt.text}
                            </div>
                          ))}
                        </div>
                      )}
                      {(m.after.rankingItems ?? []).length > 0 && (
                        <div className="mt-2.5 space-y-1.5">
                          {(m.after.rankingItems ?? []).map((r, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-green-600/70">
                              <span className="h-4 w-4 rounded-full bg-green-100 flex items-center justify-center text-[10px] font-bold text-green-500 shrink-0">{r.correctPosition}</span>
                              {r.label}
                            </div>
                          ))}
                        </div>
                      )}
                      {m.after.mapQuestion && (
                        <>
                          <MiniMap lat={m.after.mapQuestion.lat} lng={m.after.mapQuestion.lng} rings={m.after.mapQuestion.rings} borderClass="border-green-200" />
                          <p className="mt-1 text-[10px] text-green-600/70">{m.after.mapQuestion.lat.toFixed(4)}, {m.after.mapQuestion.lng.toFixed(4)}</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="px-5 pb-5 flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={() => claimUpdate.mutate(buildClaimBody())}
            disabled={claimUpdate.isPending || !diff}
            className="flex-1 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {claimUpdate.isPending
              ? t('marketplace.updating', { defaultValue: 'Updating…' })
              : t('marketplace.get_update', { defaultValue: 'Apply changes' })}
          </button>
        </div>
      </div>
    </div>
  )
}
