import type { Area } from 'react-easy-crop'

export async function getCroppedBlob(imageSrc: string, croppedAreaPixels: Area): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', reject)
    img.src = imageSrc
  })

  // Always output at a fixed avatar size so the blob stays well under the
  // server's 2 MB limit regardless of the source image resolution.
  const OUTPUT_SIZE = 512
  const canvas = document.createElement('canvas')
  canvas.width = OUTPUT_SIZE
  canvas.height = OUTPUT_SIZE
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE,
  )

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Canvas toBlob failed'))
      },
      'image/jpeg',
      0.9,
    )
  })
}
