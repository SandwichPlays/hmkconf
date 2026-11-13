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

import { keyboardContext } from "$lib/keyboard"
import { HMK_MAX_DISTANCE, HMK_MIN_DISTANCE, type HMK_Calibration } from "$lib/libhmk"

export const SWITCH_DISTANCE_UNIT = 1000

export function getSwitchDistanceMM(keyIndex?: number, calibration?: HMK_Calibration) {
  if (calibration?.switchTravel && calibration.switchTravel.length > 0) {
    if (keyIndex !== undefined && calibration.switchTravel[keyIndex] !== undefined) {
      return calibration.switchTravel[keyIndex] / 10
    }
    return calibration.switchTravel[0] / 10
  }
  try {
    const kb = keyboardContext.get()
    return kb?.metadata?.switchTravel ?? 4.0
  } catch {
    return 4.0
  }
}

export function distanceToMM(v: number, _keyIndex?: number, _calibration?: HMK_Calibration): number {
  if (v <= 0) return 0
  return Number((v / 1000).toFixed(2))
}

export function mmToDistance(mm: number, keyIndex?: number, calibration?: HMK_Calibration): number {
  if (mm <= 0) return 0
  const travel = getSwitchDistanceMM(keyIndex, calibration)
  const maxDistance = Math.round(travel * 1000)
  return Math.max(0, Math.min(maxDistance, Math.round(mm * 1000)))
}

export function unitToDistance(v: number, keyIndex?: number, calibration?: HMK_Calibration) {
  return mmToDistance(v, keyIndex, calibration)
}

export function distanceToUnit(v: number, keyIndex?: number, calibration?: HMK_Calibration) {
  return distanceToMM(v, keyIndex, calibration)
}

export function displayUnitDistance(v: number, _keyIndex?: number, _calibration?: HMK_Calibration, decimal = 2) {
  return (v / 1000).toFixed(decimal)
}

export function displayDistance(v: number, _keyIndex?: number, _calibration?: HMK_Calibration, decimal = 2) {
  return (v / 1000).toFixed(decimal)
}
