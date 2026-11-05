// The YouTube Data API returns titles HTML-encoded ("What I&#39;ve Done").
// Stored titles are kept raw (see musicStore and backupStore), so decoding
// happens only at render time. That also fixes songs saved before this
// helper existed, and nothing is ever decoded twice.
//
// Every "<" is escaped before parsing, so the parser only ever sees text and
// never builds elements: "<script>" comes back as the literal text
// "<script>". React then renders the result as plain text.
export function decodeTitle(title) {
  if (typeof title !== 'string' || !title.includes('&')) return title
  if (typeof DOMParser === 'undefined') return title

  const doc = new DOMParser().parseFromString(title.replaceAll('<', '&lt;'), 'text/html')
  return doc.documentElement.textContent ?? title
}
