// Shared by photo upload (Manage) and backup restore, so both ever only
// accept the same set of image types: whatever a caregiver can add here is
// guaranteed to also survive a backup and restore, and nothing restore
// accepts can be something upload would have rejected.
//
// JPEG, PNG, GIF and WEBP are checked by magic bytes rather than file
// extension or declared MIME type, since neither of those can be trusted.
// This is also deliberately a narrower set than "any image the browser's
// file picker calls an image" (which can include formats like HEIC): these
// four are what both PhotosScreen's <img> and every target browser (Chrome
// on Android, Safari on iOS, Firefox) can reliably display.
export const ACCEPTED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
export const ACCEPT_ATTRIBUTE = ACCEPTED_IMAGE_MIME_TYPES.join(',')

export function sniffImageType(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ext: 'jpg', mime: 'image/jpeg' }
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { ext: 'png', mime: 'image/png' }
  }
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return { ext: 'gif', mime: 'image/gif' }
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { ext: 'webp', mime: 'image/webp' }
  }
  return null
}

// Reads just enough of a File/Blob to sniff its real type, without loading
// the whole file into memory.
export async function isSupportedImageFile(file) {
  const head = await file.slice(0, 16).arrayBuffer()
  return sniffImageType(new Uint8Array(head)) !== null
}
