import { useState, useEffect, useCallback, useRef } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../lib/api'
import NavDropdown from '../components/ui/NavDropdown'
import {
  useQuiz,
  useUpdateQuiz,
  useAddQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
  useReorderQuestions,
  type Question,
  type QuestionType,
  type QuestionPayload,
  type QuizWithQuestions,
} from '../hooks/useQuizzes'

// Leaflet's default icon paths break in Vite — point them at unpkg instead
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ─── Types ────────────────────────────────────────────────────────────────────

interface RingField {
  radiusKm: string
  points: string
}

interface RankingItemField {
  id: string
  label: string
}

interface FormState {
  type: QuestionType
  text: string
  imageUrl: string
  timeLimit: number
  points: number
  options: { text: string; isCorrect: boolean }[]
  correctAnswer: 'true' | 'false'
  mapLat: string
  mapLng: string
  mapRings: RingField[]
  rankingItems: RankingItemField[]
  correctAnswers: string[]
}

const QUESTION_TYPES: QuestionType[] = [
  'MULTIPLE_CHOICE',
  'TRUE_FALSE',
  'OPEN_ENDED',
  'IMAGE',
  'MAP',
  'RANKING',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function blankForm(type: QuestionType = 'MULTIPLE_CHOICE'): FormState {
  return {
    type,
    text: '',
    imageUrl: '',
    timeLimit: 20,
    points: 1,
    options: [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
    ],
    correctAnswer: 'true',
    mapLat: '',
    mapLng: '',
    mapRings: [{ radiusKm: '50', points: '1000' }],
    rankingItems: [
      { id: crypto.randomUUID(), label: '' },
      { id: crypto.randomUUID(), label: '' },
    ],
    correctAnswers: [],
  }
}

function questionToForm(q: Question): FormState {
  const form = blankForm(q.type)
  form.text = q.text
  form.imageUrl = q.imageUrl ?? ''
  form.timeLimit = q.timeLimit
  form.points = q.points

  if (q.type === 'MULTIPLE_CHOICE' || q.type === 'IMAGE') {
    form.options =
      q.answerOptions.length > 0
        ? q.answerOptions.map((o) => ({ text: o.text, isCorrect: o.isCorrect }))
        : [{ text: '', isCorrect: true }, { text: '', isCorrect: false }]
  }
  if (q.type === 'TRUE_FALSE') {
    const correct = q.answerOptions.find((o) => o.isCorrect)
    form.correctAnswer = correct?.text.toLowerCase() === 'true' ? 'true' : 'false'
  }
  if (q.type === 'MAP' && q.mapQuestion) {
    form.mapLat = String(q.mapQuestion.lat)
    form.mapLng = String(q.mapQuestion.lng)
    form.mapRings =
      q.mapQuestion.rings.length > 0
        ? q.mapQuestion.rings.map((r) => ({ radiusKm: String(r.radiusKm), points: String(r.points) }))
        : [{ radiusKm: '50', points: '1000' }]
  }
  if (q.type === 'RANKING') {
    form.rankingItems =
      q.rankingItems.length > 0
        ? [...q.rankingItems]
            .sort((a, b) => a.correctPosition - b.correctPosition)
            .map((r) => ({ id: r.id, label: r.label }))
        : [
            { id: crypto.randomUUID(), label: '' },
            { id: crypto.randomUUID(), label: '' },
          ]
  }
  if (q.type === 'OPEN_ENDED') {
    form.correctAnswers = q.correctAnswers ?? []
  }
  return form
}

function formToPayload(form: FormState, order: number): QuestionPayload {
  const base = { type: form.type, text: form.text.trim(), timeLimit: form.timeLimit, points: form.points, order }

  if (form.type === 'TRUE_FALSE') return { ...base, correctAnswer: form.correctAnswer, imageUrl: form.imageUrl.trim() || undefined }
  if (form.type === 'OPEN_ENDED') return {
    ...base,
    imageUrl: form.imageUrl.trim() || undefined,
    correctAnswers: form.correctAnswers.filter((a) => a.trim()),
  }
  if (form.type === 'MULTIPLE_CHOICE' || form.type === 'IMAGE') {
    return {
      ...base,
      imageUrl: form.type === 'IMAGE' ? form.imageUrl.trim() || undefined : undefined,
      answerOptions: form.options.filter((o) => o.text.trim()),
    }
  }
  if (form.type === 'MAP') {
    const rings = form.mapRings
      .map((r, i) => ({ radiusKm: parseFloat(r.radiusKm), points: parseInt(r.points), order: i }))
      .filter((r) => r.radiusKm > 0 && !isNaN(r.radiusKm) && !isNaN(r.points))
      .sort((a, b) => a.radiusKm - b.radiusKm)
      .map((r, i) => ({ ...r, order: i }))
    return {
      ...base,
      mapQuestion: { lat: parseFloat(form.mapLat), lng: parseFloat(form.mapLng), rings },
    }
  }
  if (form.type === 'RANKING') {
    const items = form.rankingItems
      .filter((r) => r.label.trim())
      .map((r, i) => ({ label: r.label.trim(), correctPosition: i + 1, order: i }))
    return { ...base, imageUrl: form.imageUrl.trim() || undefined, rankingItems: items }
  }
  return base
}

// ─── Map Picker ────────────────────────────────────────────────────────────────

function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

// Sets the initial map view once on mount without tying the map to React state
function MapInitializer({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, zoom)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

function ringFillOpacity(index: number, total: number): number {
  if (total === 1) return 0.35
  return 0.40 - (index / (total - 1)) * 0.32
}

function MapPicker({
  lat,
  lng,
  rings,
  onChange,
}: {
  lat: string
  lng: string
  rings: RingField[]
  onChange: (lat: string, lng: string) => void
}) {
  const { t } = useTranslation()
  const parsedLat = parseFloat(lat)
  const parsedLng = parseFloat(lng)
  const hasPin = !isNaN(parsedLat) && !isNaN(parsedLng)
  const position: [number, number] | null = hasPin ? [parsedLat, parsedLng] : null
  const center: [number, number] = position ?? [20, 0]
  const zoom = position ? 6 : 2

  const validRings = rings
    .map((r, i) => ({ ...r, index: i }))
    .filter((r) => parseFloat(r.radiusKm) > 0)
    .sort((a, b) => parseFloat(a.radiusKm) - parseFloat(b.radiusKm))

  const renderRings = [...validRings].reverse()

  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        {t('quiz_editor.map_pin_label')}
      </label>
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700" style={{ height: 280 }}>
        <MapContainer center={[0, 0]} zoom={2} style={{ height: '100%', width: '100%' }}>
          <MapInitializer center={center} zoom={zoom} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onMapClick={(lt, lg) => onChange(lt.toFixed(6), lg.toFixed(6))} />
          {position &&
            renderRings.map((ring, i) => {
              const colorIndex = renderRings.length - 1 - i
              const fillOpacity = ringFillOpacity(colorIndex, validRings.length)
              return (
                <Circle
                  key={ring.index}
                  center={position}
                  radius={parseFloat(ring.radiusKm) * 1000}
                  pathOptions={{
                    fillColor: '#dc2626',
                    fillOpacity,
                    color: '#dc2626',
                    weight: 1.5,
                    opacity: Math.min(fillOpacity + 0.25, 0.75),
                  }}
                />
              )
            })}
          {position && (
            <Marker
              position={position}
              draggable
              eventHandlers={{
                dragend(e) {
                  const latlng = (e.target as L.Marker).getLatLng()
                  onChange(latlng.lat.toFixed(6), latlng.lng.toFixed(6))
                },
              }}
            />
          )}
        </MapContainer>
      </div>
      {hasPin ? (
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{parsedLat.toFixed(5)}, {parsedLng.toFixed(5)}</p>
      ) : (
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{t('quiz_editor.no_pin')}</p>
      )}
    </div>
  )
}

// ─── Sortable Ranking Item (editor) ───────────────────────────────────────────

function SortableRankingEditorItem({
  item,
  index,
  showRemove,
  onLabelChange,
  onRemove,
}: {
  item: RankingItemField
  index: number
  showRemove: boolean
  onLabelChange: (label: string) => void
  onRemove: () => void
}) {
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="flex items-center gap-2"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none p-1 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 active:cursor-grabbing"
        aria-label={t('quiz_editor.drag_to_reorder')}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="5" cy="4" r="1.5" /><circle cx="11" cy="4" r="1.5" />
          <circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" />
          <circle cx="5" cy="12" r="1.5" /><circle cx="11" cy="12" r="1.5" />
        </svg>
      </button>
      <span className="w-5 shrink-0 text-center text-xs font-medium text-gray-400 dark:text-gray-500">{index + 1}</span>
      <input
        type="text"
        value={item.label}
        onChange={(e) => onLabelChange(e.target.value)}
        placeholder={t('quiz_editor.option_placeholder', { n: index + 1 })}
        className="flex-1 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-1.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      {showRemove && (
        <button type="button" onClick={onRemove} className="text-gray-400 hover:text-red-500">
          ✕
        </button>
      )}
    </div>
  )
}

// ─── Question Form ─────────────────────────────────────────────────────────────

const INPUT_CLS = 'rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500'
const LABEL_CLS = 'mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500'

function QuestionForm({
  initial,
  order,
  onSave,
  onCancel,
  isSaving,
}: {
  initial: FormState
  order: number
  onSave: (payload: QuestionPayload) => void
  onCancel: () => void
  isSaving: boolean
}) {
  const { t } = useTranslation()
  const [form, setForm] = useState<FormState>(initial)
  const rankingSensors = useSensors(useSensor(PointerSensor))
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  async function handleImageUpload(file: File) {
    setIsUploadingImage(true)
    try {
      const body = new FormData()
      body.append('image', file)
      const { data } = await api.post<{ url: string }>('/quiz/upload-image', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      set({ imageUrl: data.url })
    } finally {
      setIsUploadingImage(false)
      if (imageInputRef.current) imageInputRef.current.value = ''
    }
  }

  function set(patch: Partial<FormState>) {
    setForm((f) => ({ ...f, ...patch }))
  }

  function setOptionText(i: number, text: string) {
    const options = [...form.options]
    options[i] = { ...options[i], text }
    set({ options })
  }

  function setCorrectOption(i: number) {
    set({ options: form.options.map((o, idx) => ({ ...o, isCorrect: idx === i })) })
  }

  function addOption() {
    if (form.options.length >= 4) return
    set({ options: [...form.options, { text: '', isCorrect: false }] })
  }

  function removeOption(i: number) {
    if (form.options.length <= 2) return
    const options = form.options.filter((_, idx) => idx !== i)
    if (!options.some((o) => o.isCorrect)) options[0].isCorrect = true
    set({ options })
  }

  function addRing() {
    if (form.mapRings.length >= 4) return
    set({ mapRings: [...form.mapRings, { radiusKm: '', points: '' }] })
  }

  function removeRing(i: number) {
    if (form.mapRings.length <= 1) return
    set({ mapRings: form.mapRings.filter((_, idx) => idx !== i) })
  }

  function setRing(i: number, patch: Partial<RingField>) {
    const mapRings = [...form.mapRings]
    mapRings[i] = { ...mapRings[i], ...patch }
    set({ mapRings })
  }

  function addCorrectAnswer() {
    set({ correctAnswers: [...form.correctAnswers, ''] })
  }

  function removeCorrectAnswer(i: number) {
    set({ correctAnswers: form.correctAnswers.filter((_, idx) => idx !== i) })
  }

  function setCorrectAnswerText(i: number, text: string) {
    const correctAnswers = [...form.correctAnswers]
    correctAnswers[i] = text
    set({ correctAnswers })
  }

  function addRankingItem() {
    set({ rankingItems: [...form.rankingItems, { id: crypto.randomUUID(), label: '' }] })
  }

  function removeRankingItem(i: number) {
    if (form.rankingItems.length <= 2) return
    set({ rankingItems: form.rankingItems.filter((_, idx) => idx !== i) })
  }

  function setRankingItemLabel(i: number, label: string) {
    const rankingItems = [...form.rankingItems]
    rankingItems[i] = { ...rankingItems[i], label }
    set({ rankingItems })
  }

  function handleTypeChange(type: QuestionType) {
    setForm(blankForm(type))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.text.trim()) return
    if (form.type === 'RANKING' && form.rankingItems.filter((r) => r.label.trim()).length < 2) return
    onSave(formToPayload(form, order))
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl bg-gray-50 dark:bg-gray-700/50 p-4 space-y-4">
      <div className="flex gap-3">
        <div className="flex-1">
          <label className={LABEL_CLS}>{t('quiz_editor.type_label')}</label>
          <select
            value={form.type}
            onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
            className={`w-full ${INPUT_CLS} pr-8`}
          >
            {QUESTION_TYPES.map((qtype) => (
              <option key={qtype} value={qtype}>{t(`quiz_editor.types.${qtype}`)}</option>
            ))}
          </select>
        </div>
        <div>
          <div className="mb-1.5 flex items-center gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{t('quiz_editor.time_label')}</span>
            <span className="group relative flex items-center">
              <span className="cursor-default text-xs text-gray-400 hover:text-gray-600">ⓘ</span>
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 w-52 -translate-x-1/2 rounded-xl bg-gray-900 px-3 py-2 text-xs font-normal normal-case tracking-normal text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                {t('quiz_editor.time_tooltip')}
              </span>
            </span>
          </div>
          <input
            type="number"
            min={5}
            max={120}
            value={form.timeLimit}
            onChange={(e) => set({ timeLimit: Number(e.target.value) })}
            className={`w-20 ${INPUT_CLS}`}
          />
        </div>
        {form.type !== 'MAP' && (
          <div>
            <label className={LABEL_CLS}>{t('quiz_editor.points_label')}</label>
            <input
              type="number"
              min={1}
              step={1}
              value={form.points}
              onChange={(e) => set({ points: Number(e.target.value) })}
              className={`w-24 ${INPUT_CLS}`}
            />
          </div>
        )}
      </div>

      <div>
        <label className={LABEL_CLS}>{t('quiz_editor.question_label')}</label>
        <textarea
          required
          rows={2}
          value={form.text}
          onChange={(e) => set({ text: e.target.value })}
          placeholder={t('quiz_editor.question_placeholder')}
          className={`w-full ${INPUT_CLS}`}
        />
      </div>

      {(form.type === 'IMAGE' || form.type === 'RANKING' || form.type === 'OPEN_ENDED' || form.type === 'TRUE_FALSE') && (
        <div>
          <label className={LABEL_CLS}>{t('quiz_editor.image_label')}</label>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleImageUpload(file)
            }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={isUploadingImage}
              className="rounded-xl border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              {isUploadingImage ? t('quiz_editor.uploading') : t('quiz_editor.upload_image')}
            </button>
            <input
              type="url"
              value={form.imageUrl}
              onChange={(e) => set({ imageUrl: e.target.value })}
              placeholder={t('quiz_editor.paste_url')}
              className={`flex-1 ${INPUT_CLS}`}
            />
          </div>
          {form.imageUrl && (
            <div className="mt-2 flex items-start gap-2">
              <img
                src={form.imageUrl}
                alt="preview"
                className="h-32 w-auto rounded-xl object-cover"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
              <button
                type="button"
                onClick={() => set({ imageUrl: '' })}
                className="text-xs text-gray-400 hover:text-red-500"
              >
                {t('quiz_editor.remove')}
              </button>
            </div>
          )}
        </div>
      )}

      {form.type === 'OPEN_ENDED' && (
        <div className="space-y-2">
          <label className={LABEL_CLS}>
            {t('quiz_editor.accepted_answers')} <span className="font-normal normal-case text-gray-400">{t('quiz_editor.accepted_answers_hint')}</span>
          </label>
          {form.correctAnswers.map((answer, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={answer}
                onChange={(e) => setCorrectAnswerText(i, e.target.value)}
                placeholder={t('quiz_editor.answer_placeholder', { n: i + 1 })}
                className={`flex-1 ${INPUT_CLS}`}
              />
              <button type="button" onClick={() => removeCorrectAnswer(i)} className="text-gray-400 hover:text-red-500">
                ✕
              </button>
            </div>
          ))}
          <button type="button" onClick={addCorrectAnswer} className="text-sm text-indigo-600 hover:underline">
            {t('quiz_editor.add_answer')}
          </button>
        </div>
      )}

      {(form.type === 'MULTIPLE_CHOICE' || form.type === 'IMAGE') && (
        <div className="space-y-2">
          <label className={LABEL_CLS}>{t('quiz_editor.answer_options')}</label>
          {form.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name="correct"
                checked={opt.isCorrect}
                onChange={() => setCorrectOption(i)}
                className="accent-indigo-600"
                title={t('quiz_editor.mark_correct')}
              />
              <input
                type="text"
                value={opt.text}
                onChange={(e) => setOptionText(i, e.target.value)}
                placeholder={t('quiz_editor.option_placeholder', { n: i + 1 })}
                className={`flex-1 ${INPUT_CLS}`}
              />
              {form.options.length > 2 && (
                <button type="button" onClick={() => removeOption(i)} className="text-gray-400 hover:text-red-500">
                  ✕
                </button>
              )}
            </div>
          ))}
          {form.options.length < 4 && (
            <button type="button" onClick={addOption} className="text-sm text-indigo-600 hover:underline">
              {t('quiz_editor.add_option')}
            </button>
          )}
        </div>
      )}

      {form.type === 'TRUE_FALSE' && (
        <div>
          <label className={`${LABEL_CLS} mb-2`}>{t('quiz_editor.correct_answer')}</label>
          <div className="flex gap-4">
            {(['true', 'false'] as const).map((val) => (
              <label key={val} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="tf"
                  value={val}
                  checked={form.correctAnswer === val}
                  onChange={() => set({ correctAnswer: val })}
                  className="accent-indigo-600"
                />
                {val === 'true' ? t('common.true') : t('common.false')}
              </label>
            ))}
          </div>
        </div>
      )}

      {form.type === 'MAP' && (
        <div className="space-y-4">
          <MapPicker
            lat={form.mapLat}
            lng={form.mapLng}
            rings={form.mapRings}
            onChange={(lat, lng) => set({ mapLat: lat, mapLng: lng })}
          />

          <div>
            <label className={`${LABEL_CLS} mb-2`}>
              {t('quiz_editor.scoring_rings')}
            </label>
            <div className="space-y-2">
              {form.mapRings.map((ring, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 shrink-0 rounded-full border border-red-400"
                    style={{ backgroundColor: `rgba(220,38,38,${0.40 - (i / Math.max(form.mapRings.length - 1, 1)) * 0.32})` }}
                  />
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={ring.radiusKm}
                    onChange={(e) => setRing(i, { radiusKm: e.target.value })}
                    placeholder="km"
                    className={`w-20 ${INPUT_CLS}`}
                  />
                  <span className="text-xs text-gray-400 dark:text-gray-500">{t('quiz_editor.km_arrow')}</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={ring.points}
                    onChange={(e) => setRing(i, { points: e.target.value })}
                    placeholder="pts"
                    className={`w-20 ${INPUT_CLS}`}
                  />
                  <span className="text-xs text-gray-400 dark:text-gray-500">{t('common.pts')}</span>
                  {form.mapRings.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRing(i)}
                      className="ml-auto text-gray-400 hover:text-red-500"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {form.mapRings.length < 4 && (
                <button type="button" onClick={addRing} className="text-sm text-indigo-600 hover:underline">
                  {t('quiz_editor.add_ring')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {form.type === 'RANKING' && (
        <div className="space-y-2">
          <label className={LABEL_CLS}>
            {t('quiz_editor.ranking_label')}
          </label>
          <DndContext
            sensors={rankingSensors}
            collisionDetection={closestCenter}
            onDragEnd={(event) => {
              const { active, over } = event
              if (!over || active.id === over.id) return
              const oldIndex = form.rankingItems.findIndex((r) => r.id === active.id)
              const newIndex = form.rankingItems.findIndex((r) => r.id === over.id)
              set({ rankingItems: arrayMove(form.rankingItems, oldIndex, newIndex) })
            }}
          >
            <SortableContext items={form.rankingItems.map((r) => r.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1.5">
                {form.rankingItems.map((item, i) => (
                  <SortableRankingEditorItem
                    key={item.id}
                    item={item}
                    index={i}
                    showRemove={form.rankingItems.length > 2}
                    onLabelChange={(label) => setRankingItemLabel(i, label)}
                    onRemove={() => removeRankingItem(i)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <button type="button" onClick={addRankingItem} className="text-sm text-indigo-600 hover:underline">
            {t('quiz_editor.add_item')}
          </button>
          {form.rankingItems.length < 2 && (
            <p className="text-xs text-red-500">{t('quiz_editor.min_items')}</p>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-gray-200 dark:border-gray-700 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-gray-200 dark:border-gray-600 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {isSaving ? t('common.saving') : t('quiz_editor.save_question')}
        </button>
      </div>
    </form>
  )
}

// ─── Question Card ─────────────────────────────────────────────────────────────

function QuestionCard({
  question,
  index,
  quizId,
  isEditing,
  onEdit,
  onClose,
}: {
  question: Question
  index: number
  quizId: string
  isEditing: boolean
  onEdit: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const updateQuestion = useUpdateQuestion(quizId)
  const deleteQuestion = useDeleteQuestion(quizId)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
    disabled: isEditing,
  })

  function handleSave(payload: QuestionPayload) {
    updateQuestion.mutate({ qid: question.id, ...payload }, { onSuccess: onClose })
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm"
    >
      {isEditing ? (
        <div className="p-5">
          <QuestionForm
            initial={questionToForm(question)}
            order={question.order}
            onSave={handleSave}
            onCancel={onClose}
            isSaving={updateQuestion.isPending}
          />
        </div>
      ) : (
        <div className="flex items-start gap-3 p-5">
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 shrink-0 cursor-grab touch-none p-1 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 active:cursor-grabbing"
            aria-label={t('quiz_editor.drag_to_reorder')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="5" cy="4" r="1.5" /><circle cx="11" cy="4" r="1.5" />
              <circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" />
              <circle cx="5" cy="12" r="1.5" /><circle cx="11" cy="12" r="1.5" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="text-xs font-medium text-gray-400 dark:text-gray-500">Q{index + 1}</span>
              <span className="rounded-lg bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                {t(`quiz_editor.types.${question.type}`)}
              </span>
            </div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{question.text}</p>
            {(question.type === 'MULTIPLE_CHOICE' || question.type === 'IMAGE') && (
              <ul className="mt-2 space-y-1">
                {question.answerOptions.map((opt) => (
                  <li key={opt.id} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <span className={opt.isCorrect ? 'text-green-500' : 'text-gray-300 dark:text-gray-600'}>●</span>
                    {opt.text}
                  </li>
                ))}
              </ul>
            )}
            {question.type === 'TRUE_FALSE' && (
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                {t('quiz_editor.correct_prefix')} {question.answerOptions.find((o) => o.isCorrect)?.text ?? '—'}
              </p>
            )}
            {question.type === 'OPEN_ENDED' && question.correctAnswers.length > 0 && (
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                {t('quiz_editor.accepted_prefix')} {question.correctAnswers.join(' / ')}
              </p>
            )}
            {question.type === 'MAP' && question.mapQuestion && (
              <div className="mt-1 space-y-0.5">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {question.mapQuestion.lat.toFixed(4)}, {question.mapQuestion.lng.toFixed(4)}
                </p>
                {question.mapQuestion.rings.map((r, i) => (
                  <p key={r.id} className="text-xs text-gray-400 dark:text-gray-500">
                    {t('quiz_editor.ring_display', { n: i + 1, radiusKm: r.radiusKm, points: r.points })}
                  </p>
                ))}
              </div>
            )}
            {question.type === 'RANKING' && question.rankingItems.length > 0 && (
              <ol className="mt-2 list-decimal list-inside space-y-0.5">
                {[...question.rankingItems]
                  .sort((a, b) => a.correctPosition - b.correctPosition)
                  .map((r) => (
                    <li key={r.id} className="text-xs text-gray-500 dark:text-gray-400">{r.label}</li>
                  ))}
              </ol>
            )}
          </div>
          <div className="flex shrink-0 gap-1.5">
            <button
              onClick={onEdit}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              {t('common.edit')}
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={deleteQuestion.isPending}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-400 dark:text-gray-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors disabled:opacity-50"
            >
              {t('common.delete')}
            </button>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('quiz_editor.delete_question_title')}</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t('quiz_editor.delete_question_body', { text: question.text })}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleteQuestion.isPending}
                className="rounded-xl border border-gray-200 dark:border-gray-600 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 transition hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => deleteQuestion.mutate(question.id, { onSettled: () => setConfirmDelete(false) })}
                disabled={deleteQuestion.isPending}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {deleteQuestion.isPending ? t('common.deleting') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Add Question Card ─────────────────────────────────────────────────────────

function AddQuestionCard({ quizId, order, onClose }: { quizId: string; order: number; onClose: () => void }) {
  const { t } = useTranslation()
  const addQuestion = useAddQuestion(quizId)

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm p-5">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{t('quiz_editor.new_question')}</p>
      <QuestionForm
        initial={blankForm()}
        order={order}
        onSave={(payload) => addQuestion.mutate(payload, { onSuccess: onClose })}
        onCancel={onClose}
        isSaving={addQuestion.isPending}
      />
    </div>
  )
}

// ─── Quiz Meta Form ────────────────────────────────────────────────────────────

function QuizMetaForm({
  quiz,
  onSave,
  isSaving,
}: {
  quiz: QuizWithQuestions
  onSave: (title: string, description?: string) => void
  isSaving: boolean
}) {
  const { t } = useTranslation()
  const [title, setTitle] = useState(quiz.title)
  const [description, setDescription] = useState(quiz.description ?? '')

  return (
    <section className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm p-6 space-y-4">
      <div>
        <label className={LABEL_CLS}>{t('quiz_editor.title_label')}</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={`w-full ${INPUT_CLS} text-lg font-semibold`}
        />
      </div>
      <div>
        <label className={LABEL_CLS}>{t('quiz_editor.description_label')} <span className="font-normal normal-case text-gray-400 dark:text-gray-500">{t('quiz_editor.description_optional')}</span></label>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('quiz_editor.description_placeholder')}
          className={`w-full ${INPUT_CLS}`}
        />
      </div>
      <div className="flex justify-end border-t border-gray-100 dark:border-gray-700 pt-4">
        <button
          onClick={() => onSave(title.trim(), description.trim() || undefined)}
          disabled={isSaving || !title.trim()}
          className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {isSaving ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </section>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function QuizEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { data: quiz, isLoading, isError } = useQuiz(id!)
  const updateQuiz = useUpdateQuiz(id!)
  const reorderQuestions = useReorderQuestions(id!)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [addingQuestion, setAddingQuestion] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor))

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !quiz) return
    const oldIndex = quiz.questions.findIndex((q) => q.id === active.id)
    const newIndex = quiz.questions.findIndex((q) => q.id === over.id)
    const reordered = arrayMove(quiz.questions, oldIndex, newIndex)
    reorderQuestions.mutate(reordered.map((q, i) => ({ id: q.id, order: i })))
  }, [quiz, reorderQuestions])

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-gray-400 dark:text-gray-500">{t('common.loading')}</div>
  }

  if (isError || !quiz) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-gray-500 dark:text-gray-400">
        <p>{t('quiz_editor.not_found')}</p>
        <Link to="/dashboard" className="text-indigo-600 hover:underline">{t('quiz_editor.back_to_dashboard')}</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 border-b border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/dashboard')}
              className="shrink-0 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              {t('quiz_editor.back')}
            </button>
            <span className="shrink-0 text-gray-200 dark:text-gray-700">|</span>
            <span className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">{quiz.title}</span>
          </div>
          <NavDropdown />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
        <QuizMetaForm
          key={quiz.id}
          quiz={quiz}
          onSave={(title, description) => updateQuiz.mutate({ title, description }, { onSuccess: () => navigate('/dashboard') })}
          isSaving={updateQuiz.isPending}
        />

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {t('quiz_editor.questions_count', { count: quiz.questions.length })}
            </h2>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={quiz.questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {quiz.questions.map((q, i) => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    index={i}
                    quizId={id!}
                    isEditing={editingId === q.id}
                    onEdit={() => { setAddingQuestion(false); setEditingId(q.id) }}
                    onClose={() => setEditingId(null)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {addingQuestion && (
            <div className="mt-3">
              <AddQuestionCard
                quizId={id!}
                order={quiz.questions.length}
                onClose={() => setAddingQuestion(false)}
              />
            </div>
          )}

          {!addingQuestion && (
            <button
              onClick={() => { setEditingId(null); setAddingQuestion(true) }}
              className="mt-3 w-full rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 py-4 text-sm font-semibold text-gray-400 dark:text-gray-500 transition hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/30 hover:text-indigo-600"
            >
              {t('quiz_editor.add_question')}
            </button>
          )}
        </section>
      </main>
    </div>
  )
}
