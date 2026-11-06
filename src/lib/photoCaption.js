// The longest caption a backup accepts. Captions typed in Settings use the
// same limit, so anything saved here can always be backed up and restored.
export const MAX_CAPTION_LENGTH = 2000

// A caption is shown as one line under the photo. Line breaks (from a paste,
// for example) become a single space, and the result is cut to the limit.
export function normalizeCaption(text) {
  return String(text ?? '')
    .replace(/\s*[\r\n]+\s*/g, ' ')
    .trim()
    .slice(0, MAX_CAPTION_LENGTH)
}
