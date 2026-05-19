import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { getCroppedBlob } from '../../lib/cropImage'

interface Props {
  imageSrc: string
  onSave: (blob: Blob) => Promise<void>
  onCancel: () => void
  saving: boolean
}

export default function AvatarCropper({ imageSrc, onSave, onCancel, saving }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  async function handleSave() {
    if (!croppedAreaPixels) return
    const blob = await getCroppedBlob(imageSrc, croppedAreaPixels)
    await onSave(blob)
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="relative h-64 w-full overflow-hidden rounded-xl bg-gray-900">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400 w-5 text-right">1×</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="flex-1 accent-indigo-600"
        />
        <span className="text-xs text-gray-400 w-5">3×</span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="border border-gray-300 text-gray-600 rounded-lg px-3 py-2 text-sm hover:bg-gray-100 transition disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
