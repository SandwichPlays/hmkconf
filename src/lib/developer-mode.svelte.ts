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

export const developerModeState = $state({
  enabled: false,
})

export function setDeveloperMode(enabled: boolean) {
  developerModeState.enabled = enabled
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("hmk-developer-mode", enabled ? "true" : "false")
    } catch {
      // Ignore storage errors
    }
  }
}

export function initDeveloperMode() {
  if (typeof window === "undefined") return
  try {
    const val = localStorage.getItem("hmk-developer-mode")
    developerModeState.enabled = val === "true"
  } catch {
    // Ignore storage errors
  }
}
