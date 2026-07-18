interface Props {
  size?: number
}

const base = (size: number): Record<string, unknown> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const
})

export const Play = ({ size = 18 }: Props): JSX.Element => (
  <svg {...base(size)} fill="currentColor" stroke="none">
    <path d="M7 4.5v15a1 1 0 0 0 1.53.85l12-7.5a1 1 0 0 0 0-1.7l-12-7.5A1 1 0 0 0 7 4.5Z" />
  </svg>
)

export const Pause = ({ size = 18 }: Props): JSX.Element => (
  <svg {...base(size)} fill="currentColor" stroke="none">
    <rect x="6" y="4" width="4.5" height="16" rx="1.2" />
    <rect x="13.5" y="4" width="4.5" height="16" rx="1.2" />
  </svg>
)

export const Prev = ({ size = 18 }: Props): JSX.Element => (
  <svg {...base(size)} fill="currentColor" stroke="none">
    <rect x="4" y="5" width="2.6" height="14" rx="1" />
    <path d="M20 5.8v12.4a1 1 0 0 1-1.54.84l-9.3-6.2a1 1 0 0 1 0-1.68l9.3-6.2A1 1 0 0 1 20 5.8Z" />
  </svg>
)

export const Next = ({ size = 18 }: Props): JSX.Element => (
  <svg {...base(size)} fill="currentColor" stroke="none">
    <rect x="17.4" y="5" width="2.6" height="14" rx="1" />
    <path d="M4 5.8v12.4a1 1 0 0 0 1.54.84l9.3-6.2a1 1 0 0 0 0-1.68l-9.3-6.2A1 1 0 0 0 4 5.8Z" />
  </svg>
)

export const Search = ({ size = 16 }: Props): JSX.Element => (
  <svg {...base(size)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.6-3.6" />
  </svg>
)

export const Shuffle = ({ size = 16 }: Props): JSX.Element => (
  <svg {...base(size)}>
    <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
  </svg>
)

export const Repeat = ({ size = 16 }: Props): JSX.Element => (
  <svg {...base(size)}>
    <path d="m17 2 4 4-4 4" />
    <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
    <path d="m7 22-4-4 4-4" />
    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
  </svg>
)

export const RepeatOne = ({ size = 16 }: Props): JSX.Element => (
  <svg {...base(size)}>
    <path d="m17 2 4 4-4 4" />
    <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
    <path d="m7 22-4-4 4-4" />
    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    <path d="M11 10h1v5" strokeWidth={2.2} />
  </svg>
)

export const Volume = ({ size = 16 }: Props): JSX.Element => (
  <svg {...base(size)}>
    <path d="M11 5 6 9H2v6h4l5 4V5Z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    <path d="M18.5 5.5a9 9 0 0 1 0 13" />
  </svg>
)

export const VolumeMute = ({ size = 16 }: Props): JSX.Element => (
  <svg {...base(size)}>
    <path d="M11 5 6 9H2v6h4l5 4V5Z" />
    <path d="m22 9-6 6M16 9l6 6" />
  </svg>
)

export const Disc = ({ size = 16 }: Props): JSX.Element => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="2.6" />
  </svg>
)

/** lucide "user" — https://lucide.dev/icons/user */
export const User = ({ size = 16 }: Props): JSX.Element => (
  <svg {...base(size)}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

export const Tag = ({ size = 16 }: Props): JSX.Element => (
  <svg {...base(size)}>
    <path d="M3 3h8l10 10-8 8L3 11V3Z" />
    <circle cx="7.5" cy="7.5" r="1.4" fill="currentColor" />
  </svg>
)

export const Calendar = ({ size = 16 }: Props): JSX.Element => (
  <svg {...base(size)}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
)

export const Folder = ({ size = 16 }: Props): JSX.Element => (
  <svg {...base(size)}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
  </svg>
)

export const Settings = ({ size = 16 }: Props): JSX.Element => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.6 1.6 0 0 0 .33 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.33 1.6 1.6 0 0 0-1 1.47V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9.1 19.4a1.6 1.6 0 0 0-1.77.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.6 1.6 0 0 0 4.83 15a1.6 1.6 0 0 0-1.47-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9.1a1.6 1.6 0 0 0-.33-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.6 1.6 0 0 0 9 4.83a1.6 1.6 0 0 0 1-1.47V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.47 1.6 1.6 0 0 0 1.77-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.6 1.6 0 0 0 19.17 9v.09a1.6 1.6 0 0 0 1.47 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" />
  </svg>
)

export const Refresh = ({ size = 16 }: Props): JSX.Element => (
  <svg {...base(size)}>
    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    <path d="M21 3v6h-6" />
  </svg>
)

export const Back = ({ size = 18 }: Props): JSX.Element => (
  <svg {...base(size)}>
    <path d="M15 18 9 12l6-6" />
  </svg>
)

export const Plus = ({ size = 16 }: Props): JSX.Element => (
  <svg {...base(size)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const Trash = ({ size = 15 }: Props): JSX.Element => (
  <svg {...base(size)}>
    <path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15" />
  </svg>
)

export const Library = ({ size = 16 }: Props): JSX.Element => (
  <svg {...base(size)}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
)

export const Phone = ({ size = 16 }: Props): JSX.Element => (
  <svg {...base(size)}>
    <rect x="6" y="2" width="12" height="20" rx="2.5" />
    <path d="M11 18h2" />
  </svg>
)
