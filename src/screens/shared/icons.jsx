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

export function ExpandIcon() {
  return (
    <Icon strokeWidth={2.3}>
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </Icon>
  )
}

export function CollapseIcon() {
  return (
    <Icon strokeWidth={2.3}>
      <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
    </Icon>
  )
}

export function CheckIcon() {
  return (
    <Icon strokeWidth={2.6}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Icon>
  )
}

export function GlobeIcon() {
  return (
    <Icon strokeWidth={1.9}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" />
    </Icon>
  )
}

export function TextSizeIcon() {
  return (
    <Icon strokeWidth={1.9}>
      <path d="M2.5 19L8 5l5.5 14M4.3 14h7.4M15.5 19l2.5-6 2.5 6M16.3 17.2h3.4" />
    </Icon>
  )
}

export function PaletteIcon() {
  return (
    <Icon strokeWidth={1.9}>
      <path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.4-2.2-.6-1.2.2-2.3 1.6-2.3H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z" />
      <circle cx="7.5" cy="11" r="1" />
      <circle cx="10" cy="7.5" r="1" />
      <circle cx="15" cy="7.5" r="1" />
    </Icon>
  )
}

export function PlusIcon() {
  return (
    <Icon strokeWidth={2.4}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  )
}

export function SearchIcon() {
  return (
    <Icon strokeWidth={2.4}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </Icon>
  )
}

export function ShieldIcon() {
  return (
    <Icon strokeWidth={1.8}>
      <path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </Icon>
  )
}

export function DownloadIcon() {
  return (
    <Icon strokeWidth={2.3}>
      <path d="M12 4v11M7 11l5 5 5-5M5 20h14" />
    </Icon>
  )
}

export function UploadIcon() {
  return (
    <Icon strokeWidth={2.3}>
      <path d="M12 16V5M7 9l5-5 5 5M5 20h14" />
    </Icon>
  )
}

// Not in the mockups: drawn for the PIN screen in the same stroke style.
export function LockIcon() {
  return (
    <Icon strokeWidth={1.9}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
      <circle cx="12" cy="15.5" r="1.2" fill="currentColor" />
    </Icon>
  )
}
