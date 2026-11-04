import { describe, expect, it } from 'vitest'
import { ACCEPTED_IMAGE_MIME_TYPES, isSupportedImageFile, sniffImageType } from './imageSniff.js'

const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0])
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0])
const GIF_BYTES = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0])
const WEBP_BYTES = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
])

describe('imageSniff', () => {
  it('recognizes every format photo upload is allowed to accept', () => {
    // This list (ACCEPTED_IMAGE_MIME_TYPES, used for the file input's accept
    // attribute) must stay in sync with what sniffImageType recognizes:
    // whatever the picker can accept must also pass the real content check.
    expect(ACCEPTED_IMAGE_MIME_TYPES).toEqual([
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ])
    expect(sniffImageType(JPEG_BYTES)?.mime).toBe('image/jpeg')
    expect(sniffImageType(PNG_BYTES)?.mime).toBe('image/png')
    expect(sniffImageType(GIF_BYTES)?.mime).toBe('image/gif')
    expect(sniffImageType(WEBP_BYTES)?.mime).toBe('image/webp')
  })

  it('rejects bytes that are not a recognized image signature', () => {
    expect(sniffImageType(new TextEncoder().encode('not an image'))).toBeNull()
    expect(sniffImageType(new Uint8Array(0))).toBeNull()
  })

  it('isSupportedImageFile reads only the start of the file', async () => {
    const jpegFile = new Blob([JPEG_BYTES, new Uint8Array(1000)])
    const textFile = new Blob(['plain text pretending to be a photo'])

    await expect(isSupportedImageFile(jpegFile)).resolves.toBe(true)
    await expect(isSupportedImageFile(textFile)).resolves.toBe(false)
  })
})
