import { useState, useEffect, useCallback } from 'react'
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
}

const TYPE_LABELS: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: 'Multiple choice',
  TRUE_FALSE: 'True / False',
  OPEN_ENDED: 'Open-ended',
  IMAGE: 'Image',
  MAP: 'Map',
}

const QUESTION_TYPES = Object.keys(TYPE_LABELS) as QuestionType[]

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
  return form
}

function formToPayload(form: FormState, order: number): QuestionPayload {
  const base = { type: form.type, text: form.text.trim(), timeLimit: form.timeLimit, points: form.points, order }

  if (form.type === 'TRUE_FALSE') return { ...base, correctAnswer: form.correctAnswer }
  if (form.type === 'OPEN_ENDED') return base
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
  // innermost (index 0 after sort) gets 0.40, outermost gets 0.08
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
  const parsedLat = parseFloat(lat)
  const parsedLng = parseFloat(lng)
  const hasPin = !isNaN(parsedLat) && !isNaN(parsedLng)
  const position: [number, number] | null = hasPin ? [parsedLat, parsedLng] : null
  const center: [number, number] = position ?? [20, 0]
  const zoom = position ? 6 : 2

  // Sort rings smallest-first for color assignment, then reverse for rendering
  // (largest rendered first so smaller circles appear on top)
  const validRings = rings
    .map((r, i) => ({ ...r, index: i }))
    .filter((r) => parseFloat(r.radiusKm) > 0)
    .sort((a, b) => parseFloat(a.radiusKm) - parseFloat(b.radiusKm))

  const renderRings = [...validRings].reverse() // largest first for DOM layering

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500">
        Click the map to place the correct answer pin
      </label>
      <div className="overflow-hidden rounded-lg border border-gray-300" style={{ height: 280 }}>
        <MapContainer center={[0, 0]} zoom={2} style={{ height: '100%', width: '100%' }}>
          <MapInitializer center={center} zoom={zoom} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onMapClick={(lt, lg) => onChange(lt.toFixed(6), lg.toFixed(6))} />
          {position &&
            renderRings.map((ring, i) => {
              // i=0 is outermost in this reversed array; color it faded
              const colorIndex = renderRings.length - 1 - i // 0 = outermost, n-1 = innermost
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
        <p className="mt-1 text-xs text-gray-400">{parsedLat.toFixed(5)}, {parsedLng.toFixed(5)}</p>
      ) : (
        <p className="mt-1 text-xs text-gray-400">No pin placed yet</p>
      )}
    </div>
  )
}

// ─── Question Form ─────────────────────────────────────────────────────────────

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
  const [form, setForm] = useState<FormState>(initial)

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

  function handleTypeChange(type: QuestionType) {
    setForm(blankForm(type))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.text.trim()) return
    onSave(formToPayload(form, order))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-500">Type</label>
          <select
            value={form.type}
            onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {QUESTION_TYPES.map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Time (s)</label>
          <input
            type="number"
            min={5}
            max={120}
            value={form.timeLimit}
            onChange={(e) => set({ timeLimit: Number(e.target.value) })}
            className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        {form.type !== 'MAP' && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Points</label>
            <input
              type="number"
              min={1}
              step={1}
              value={form.points}
              onChange={(e) => set({ points: Number(e.target.value) })}
              className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">Question</label>
        <textarea
          required
          rows={2}
          value={form.text}
          onChange={(e) => set({ text: e.target.value })}
          placeholder="Enter your question..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {form.type === 'IMAGE' && (
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Image URL</label>
          <input
            type="url"
            value={form.imageUrl}
            onChange={(e) => set({ imageUrl: e.target.value })}
            placeholder="https://..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {form.imageUrl && (
            <img
              src={form.imageUrl}
              alt="preview"
              className="mt-2 h-32 w-auto rounded-lg object-cover"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          )}
        </div>
      )}

      {(form.type === 'MULTIPLE_CHOICE' || form.type === 'IMAGE') && (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-500">Answer options</label>
          {form.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name="correct"
                checked={opt.isCorrect}
                onChange={() => setCorrectOption(i)}
                className="accent-indigo-600"
                title="Mark as correct"
              />
              <input
                type="text"
                value={opt.text}
                onChange={(e) => setOptionText(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              + Add option
            </button>
          )}
        </div>
      )}

      {form.type === 'TRUE_FALSE' && (
        <div>
          <label className="mb-2 block text-xs font-medium text-gray-500">Correct answer</label>
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
                {val === 'true' ? 'True' : 'False'}
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
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-gray-500">
                Scoring rings (up to 4) — smallest ring wins
              </label>
              {form.mapRings.length < 4 && (
                <button type="button" onClick={addRing} className="text-xs text-indigo-600 hover:underline">
                  + Add ring
                </button>
              )}
            </div>
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
                    className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-gray-400">km →</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={ring.points}
                    onChange={(e) => setRing(i, { points: e.target.value })}
                    placeholder="pts"
                    className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-gray-400">pts</span>
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
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save question'}
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
  const updateQuestion = useUpdateQuestion(quizId)
  const deleteQuestion = useDeleteQuestion(quizId)
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
      className="rounded-xl border border-gray-200 bg-white p-5"
    >
      {isEditing ? (
        <QuestionForm
          initial={questionToForm(question)}
          order={question.order}
          onSave={handleSave}
          onCancel={onClose}
          isSaving={updateQuestion.isPending}
        />
      ) : (
        <div className="flex items-start justify-between gap-4">
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 shrink-0 cursor-grab touch-none p-1 text-gray-300 hover:text-gray-400 active:cursor-grabbing"
            aria-label="Drag to reorder"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="5" cy="4" r="1.5" /><circle cx="11" cy="4" r="1.5" />
              <circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" />
              <circle cx="5" cy="12" r="1.5" /><circle cx="11" cy="12" r="1.5" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-xs font-medium text-gray-400">Q{index + 1}</span>
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                {TYPE_LABELS[question.type]}
              </span>
            </div>
            <p className="text-sm font-medium text-gray-800">{question.text}</p>
            {(question.type === 'MULTIPLE_CHOICE' || question.type === 'IMAGE') && (
              <ul className="mt-2 space-y-1">
                {question.answerOptions.map((opt) => (
                  <li key={opt.id} className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className={opt.isCorrect ? 'text-green-500' : 'text-gray-300'}>●</span>
                    {opt.text}
                  </li>
                ))}
              </ul>
            )}
            {question.type === 'TRUE_FALSE' && (
              <p className="mt-1 text-xs text-gray-400">
                Correct: {question.answerOptions.find((o) => o.isCorrect)?.text ?? '—'}
              </p>
            )}
            {question.type === 'MAP' && question.mapQuestion && (
              <div className="mt-1 space-y-0.5">
                <p className="text-xs text-gray-400">
                  {question.mapQuestion.lat.toFixed(4)}, {question.mapQuestion.lng.toFixed(4)}
                </p>
                {question.mapQuestion.rings.map((r, i) => (
                  <p key={r.id} className="text-xs text-gray-400">
                    Ring {i + 1}: {r.radiusKm} km → {r.points} pts
                  </p>
                ))}
              </div>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={onEdit}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            >
              Edit
            </button>
            <button
              onClick={() => { if (confirm('Delete this question?')) deleteQuestion.mutate(question.id) }}
              disabled={deleteQuestion.isPending}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Add Question Card ─────────────────────────────────────────────────────────

function AddQuestionCard({ quizId, order, onClose }: { quizId: string; order: number; onClose: () => void }) {
  const addQuestion = useAddQuestion(quizId)

  return (
    <div className="rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/40 p-5">
      <p className="mb-4 text-sm font-semibold text-indigo-700">New question</p>
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
  const [title, setTitle] = useState(quiz.title)
  const [description, setDescription] = useState(quiz.description ?? '')

  return (
    <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">Description (optional)</label>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this quiz about?"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div className="flex justify-end">
        <button
          onClick={() => onSave(title.trim(), description.trim() || undefined)}
          disabled={isSaving || !title.trim()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </section>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function QuizEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
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
    return <div className="flex min-h-screen items-center justify-center text-gray-500">Loading...</div>
  }

  if (isError || !quiz) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-gray-500">
        <p>Quiz not found.</p>
        <Link to="/dashboard" className="text-indigo-600 hover:underline">Back to dashboard</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="text-sm text-gray-500 hover:text-gray-800">
            ← Dashboard
          </button>
          <span className="text-gray-300">|</span>
          <span className="truncate text-sm font-medium text-gray-700">{quiz.title}</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-6 py-10">
        <QuizMetaForm
          key={quiz.id}
          quiz={quiz}
          onSave={(title, description) => updateQuiz.mutate({ title, description })}
          isSaving={updateQuiz.isPending}
        />

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Questions ({quiz.questions.length})</h2>
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
            <AddQuestionCard
              quizId={id!}
              order={quiz.questions.length}
              onClose={() => setAddingQuestion(false)}
            />
          )}

          {!addingQuestion && (
            <button
              onClick={() => { setEditingId(null); setAddingQuestion(true) }}
              className="mt-4 w-full rounded-xl border-2 border-dashed border-gray-300 py-3 text-sm text-gray-500 transition hover:border-indigo-400 hover:text-indigo-600"
            >
              + Add question
            </button>
          )}
        </section>
      </main>
    </div>
  )
}
