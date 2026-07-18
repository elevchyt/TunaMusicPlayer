import type { ThemeName } from './types'

export interface Theme {
  name: ThemeName
  label: string
  description: string
  /** Primary accent — fills, active states, the LCD readout. */
  accent: string
  /** Slightly deeper accent for borders and hover edges. */
  accentDim: string
  /** Translucent accent for tinted backgrounds. */
  accentGlow: string
  /** Second stop of the logo gradient. */
  accent2: string
  /** Foreground used on top of a solid accent fill. */
  onAccent: string
}

export const THEMES: Theme[] = [
  {
    name: 'aqua',
    label: 'Aqua',
    description: 'Cool teal — the default',
    accent: '#5eead4',
    accentDim: '#2dd4bf',
    accentGlow: 'rgba(94, 234, 212, 0.18)',
    accent2: '#3b82f6',
    onAccent: '#06231f'
  },
  {
    name: 'winamp',
    label: 'Nullsoft',
    description: 'The classic green LCD',
    accent: '#7cfc4d',
    accentDim: '#5bd42c',
    accentGlow: 'rgba(124, 252, 77, 0.16)',
    accent2: '#15803d',
    onAccent: '#08210a'
  },
  {
    name: 'amber',
    label: 'Amber',
    description: 'Warm hi-fi VU meter',
    accent: '#fbbf24',
    accentDim: '#f59e0b',
    accentGlow: 'rgba(251, 191, 36, 0.16)',
    accent2: '#ea580c',
    onAccent: '#2a1a02'
  },
  {
    name: 'violet',
    label: 'Violet',
    description: 'Deep synth purple',
    accent: '#a78bfa',
    accentDim: '#8b5cf6',
    accentGlow: 'rgba(167, 139, 250, 0.18)',
    accent2: '#ec4899',
    onAccent: '#190a33'
  },
  {
    name: 'rose',
    label: 'Rose',
    description: 'Warm red vinyl',
    accent: '#fb7185',
    accentDim: '#f43f5e',
    accentGlow: 'rgba(251, 113, 133, 0.18)',
    accent2: '#f97316',
    onAccent: '#2c0710'
  },
  {
    name: 'azure',
    label: 'Azure',
    description: 'Cold electric blue',
    accent: '#60a5fa',
    accentDim: '#3b82f6',
    accentGlow: 'rgba(96, 165, 250, 0.18)',
    accent2: '#22d3ee',
    onAccent: '#041c3d'
  }
]

export const DEFAULT_THEME: ThemeName = 'aqua'

export function themeByName(name: string | undefined): Theme {
  return THEMES.find((t) => t.name === name) ?? THEMES[0]
}

/**
 * A theme as CSS custom properties. Kept here (rather than touching `document`
 * directly) so this module stays DOM-free and usable from the main process too.
 */
export function themeVars(name: string | undefined): Record<string, string> {
  const theme = themeByName(name)
  return {
    '--accent': theme.accent,
    '--accent-dim': theme.accentDim,
    '--accent-glow': theme.accentGlow,
    '--accent-2': theme.accent2,
    '--on-accent': theme.onAccent
  }
}
