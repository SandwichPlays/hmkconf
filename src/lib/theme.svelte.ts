/*
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later
 * version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU General Public License for more
 * details.
 *
 * You should have received a copy of the GNU General Public License along with
 * this program. If not, see <https://www.gnu.org/licenses/>.
 */

export interface ThemePreset {
  name: string
  color: string
}

export const DEFAULT_ACCENT = "default"

export const PRESET_THEMES: ThemePreset[] = [
  { name: "Default (Auto)", color: "default" },
  { name: "Sakura Pink", color: "#febed5" },
  { name: "Cyber Cyan", color: "#67e8f9" },
  { name: "Electric Violet", color: "#c084fc" },
  { name: "Emerald Mint", color: "#34d399" },
  { name: "Warm Amber", color: "#fbbf24" },
  { name: "Coral Rose", color: "#fb7185" },
  { name: "Sky Blue", color: "#60a5fa" },
  { name: "Lime Pop", color: "#a3e635" },
]

export const themeState = $state({
  accent: DEFAULT_ACCENT,
})

export function isDarkMode(): boolean {
  if (typeof document === "undefined") return true
  return document.documentElement.classList.contains("dark")
}

export function getEffectiveAccentColor(color = themeState.accent): string {
  if (color === "default") {
    return isDarkMode() ? "#ffffff" : "#09090b"
  }
  return color
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const effective = hex === "default" ? getEffectiveAccentColor("default") : hex
  const clean = effective.trim().replace(/^#/, "")
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16)
    const g = parseInt(clean[1] + clean[1], 16)
    const b = parseInt(clean[2] + clean[2], 16)
    return { r, g, b }
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16)
    const g = parseInt(clean.substring(2, 4), 16)
    const b = parseInt(clean.substring(4, 6), 16)
    return { r, g, b }
  }
  return null
}

function getLuminance(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

function darken(r: number, g: number, b: number, factor = 0.45): string {
  const dr = Math.round(r * factor)
  const dg = Math.round(g * factor)
  const db = Math.round(b * factor)
  return `#${dr.toString(16).padStart(2, "0")}${dg.toString(16).padStart(2, "0")}${db.toString(16).padStart(2, "0")}`
}

export function applyThemeColor(color: string) {
  themeState.accent = color

  if (typeof document === "undefined") return

  const effectiveHex = getEffectiveAccentColor(color)
  const rgb = hexToRgb(effectiveHex)
  if (!rgb) return

  const root = document.documentElement
  root.style.setProperty("--app-accent", effectiveHex)
  root.style.setProperty("--app-accent-rgb", `${rgb.r}, ${rgb.g}, ${rgb.b}`)

  const lum = getLuminance(rgb.r, rgb.g, rgb.b)
  const primaryFg = lum > 0.55 ? "#09090b" : "#ffffff"
  root.style.setProperty("--primary-foreground", primaryFg)
  root.style.setProperty("--sidebar-primary-foreground", primaryFg)

  const darkAccentText =
    color === "default"
      ? (isDarkMode() ? "#ffffff" : "#09090b")
      : darken(rgb.r, rgb.g, rgb.b, 0.45)
  root.style.setProperty("--accent-text-light", darkAccentText)

  try {
    localStorage.setItem("hmk-accent-color", color)
  } catch {
    // Ignore storage errors
  }
}

let observerInitialized = false

export function initTheme() {
  if (typeof window === "undefined") return
  let saved = DEFAULT_ACCENT
  try {
    const stored = localStorage.getItem("hmk-accent-color")
    if (stored && (stored === "default" || hexToRgb(stored))) {
      saved = stored
    }
  } catch {
    // Ignore storage errors
  }
  applyThemeColor(saved)

  if (!observerInitialized && typeof MutationObserver !== "undefined") {
    observerInitialized = true
    const observer = new MutationObserver(() => {
      if (themeState.accent === "default") {
        applyThemeColor("default")
      }
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })
  }
}
