// Decorative drawings for the Home tiles. Colors are fixed on purpose: they
// identify each section and do not follow the caregiver's theme.

export function PhotosIllustration() {
  return (
    <svg viewBox="0 0 360 290" aria-hidden="true" focusable="false">
      <g transform="rotate(-9 150 150)">
        <rect x="66" y="44" width="150" height="182" rx="10" fill="#FFFCF6" stroke="#E3C7AE" strokeWidth="2" />
        <rect x="78" y="56" width="126" height="122" rx="6" fill="#BFD9E6" />
        <circle cx="150" cy="96" r="16" fill="#F4C45A" />
        <path d="M78 178 Q118 130 158 152 T204 142 V178 Z" fill="#7FA987" />
      </g>
      <g transform="rotate(7 230 160)">
        <rect x="168" y="62" width="150" height="182" rx="10" fill="#FFFCF6" stroke="#E3C7AE" strokeWidth="2" />
        <rect x="180" y="74" width="126" height="122" rx="6" fill="#F6C9A8" />
        <circle cx="246" cy="116" r="14" fill="#FFFCF6" />
        <path d="M180 196 Q214 152 250 170 T306 158 V196 Z" fill="#B4532A" opacity="0.75" />
      </g>
      <path d="M48 62s-12-7.4-12-16.6A7 7 0 0 1 48 41a7 7 0 0 1 12 4.4C60 54.6 48 62 48 62z" fill="#B4532A" />
    </svg>
  )
}

export function MusicIllustration() {
  return (
    <svg viewBox="0 0 360 290" aria-hidden="true" focusable="false">
      <circle cx="150" cy="150" r="108" fill="#2B2118" />
      <circle cx="150" cy="150" r="90" fill="none" stroke="#4A3A2E" strokeWidth="2" />
      <circle cx="150" cy="150" r="74" fill="none" stroke="#4A3A2E" strokeWidth="2" />
      <circle cx="150" cy="150" r="58" fill="none" stroke="#4A3A2E" strokeWidth="2" />
      <path d="M82 96 A86 86 0 0 1 150 64" fill="none" stroke="#FFFCF6" strokeOpacity="0.25" strokeWidth="5" strokeLinecap="round" />
      <circle cx="150" cy="150" r="40" fill="#1F6A85" />
      <circle cx="150" cy="150" r="7" fill="#CFE3EC" />
      <path d="M298 92V58l26-7v34" fill="none" stroke="#1F6A85" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="288" cy="94" r="11" fill="#1F6A85" />
      <circle cx="314" cy="86" r="11" fill="#1F6A85" />
      <path d="M262 196l10-5 5 10" fill="none" stroke="#12384A" strokeOpacity="0.35" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function GameIllustration() {
  return (
    <svg viewBox="0 0 360 290" aria-hidden="true" focusable="false">
      <rect x="36" y="56" width="164" height="120" rx="38" fill="#FFFCF6" stroke="#D9B96A" strokeWidth="4" />
      <path d="M80 172L62 214L114 174Z" fill="#FFFCF6" stroke="#D9B96A" strokeWidth="4" strokeLinejoin="round" />
      <rect x="76" y="168" width="44" height="10" fill="#FFFCF6" />
      <path d="M104 142V92l30-8v44" fill="none" stroke="#8A6410" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="94" cy="144" r="12" fill="#8A6410" />
      <circle cx="124" cy="136" r="12" fill="#8A6410" />
      <rect x="160" y="112" width="164" height="124" rx="38" fill="#8A6410" />
      <path d="M284 230L306 268L252 234Z" fill="#8A6410" stroke="#8A6410" strokeWidth="4" strokeLinejoin="round" />
      <path d="M212 192V146l30-8v40" fill="none" stroke="#FFFCF6" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="202" cy="194" r="12" fill="#FFFCF6" />
      <circle cx="232" cy="186" r="12" fill="#FFFCF6" />
      <path d="M302 52l4 11 11 4-11 4-4 11-4-11-11-4 11-4z" fill="#B8892B" />
      <path d="M52 30l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#B8892B" />
    </svg>
  )
}

// Same blob shape as the design reference, used twice behind the content.
const BLOB_PATH =
  'M44.7,-58.6C57.6,-48.4,67.6,-34.1,72.2,-18.1C76.8,-2.1,75.9,15.6,68.1,29.4C60.3,43.2,45.6,53.2,30.1,60.4C14.6,67.6,-1.7,72,-17.6,69.2C-33.5,66.4,-49,56.4,-59.3,42.8C-69.6,29.2,-74.7,12,-72.6,-4C-70.5,-20,-61.2,-34.8,-49.1,-45.1C-37,-55.4,-22.1,-61.2,-5.6,-59.1C10.9,-57,31.8,-68.8,44.7,-58.6Z'

export function BackgroundBlob({ className }) {
  return (
    <svg className={className} viewBox="0 0 200 200" aria-hidden="true" focusable="false">
      <path transform="translate(100 100)" d={BLOB_PATH} />
    </svg>
  )
}
