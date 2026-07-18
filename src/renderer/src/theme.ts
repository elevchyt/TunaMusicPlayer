import { themeVars } from '@shared/themes'

/**
 * Push a theme's colours onto the document root. Everything in styles.css reads
 * these custom properties, so switching themes needs no React re-render.
 */
export function applyTheme(name: string | undefined): void {
  const root = document.documentElement.style
  for (const [key, value] of Object.entries(themeVars(name))) {
    root.setProperty(key, value)
  }
}
