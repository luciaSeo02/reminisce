// Stroke icons for the inner screens, taken from design/screens. They
// draw with currentColor so the CSS decides the color.

function Icon({ children, strokeWidth = 2 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

export function HomeIcon() {
  return (
    <Icon>
      <path d="M3 11l9-8 9 8M5 10v10h14V10" />
    </Icon>
  )
}

export function PhotosIcon() {
  return (
    <Icon strokeWidth={1.8}>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="M3 17l6-5 4 4 3-3 5 5" />
    </Icon>
  )
}

export function MusicIcon() {
  return (
    <Icon strokeWidth={1.8}>
      <path d="M9 18V6l11-2v12" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="17.5" cy="16" r="2.5" />
    </Icon>
  )
}

export function GameIcon() {
  return (
    <Icon strokeWidth={1.8}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 14c1 1.6 2.4 2.4 4 2.4s3-.8 4-2.4" />
      <circle cx="9" cy="10" r=".6" fill="currentColor" />
      <circle cx="15" cy="10" r=".6" fill="currentColor" />
    </Icon>
  )
}

export function PauseIcon() {
  return (
    <Icon strokeWidth={2.4}>
      <path d="M8 5v14M16 5v14" />
    </Icon>
  )
}

export function PlayIcon() {
  return (
    <Icon strokeWidth={2.4}>
      <path d="M7 4.5v15l12-7.5z" />
    </Icon>
  )
}

export function ArrowRightIcon() {
  return (
    <Icon strokeWidth={2.4}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Icon>
  )
}
