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

import { keyboardContext } from "./keyboard"
import { HMK_MAX_DISTANCE, HMK_MIN_DISTANCE, type HMK_Calibration } from "./libhmk"

export const SWITCH_DISTANCE_UNIT = 200

export function getSwitchDistanceMM(keyIndex?: number, calibration?: HMK_Calibration) {
  try {
    const kb = keyboardContext.get()
    if (keyIndex !== undefined && calibration?.switchTravel?.[keyIndex] !== undefined) {
      return calibration.switchTravel[keyIndex] / 10
    }
    return kb?.metadata?.switchTravel ?? 4.0
  } catch {
    return 4.0
  }
}

export function unitToDistance(v: number) {
  return Math.max(
    HMK_MIN_DISTANCE,
    Math.round((v * HMK_MAX_DISTANCE) / SWITCH_DISTANCE_UNIT),
  )
}

export function distanceToUnit(v: number) {
  return Math.round((v * SWITCH_DISTANCE_UNIT) / HMK_MAX_DISTANCE)
}

export function displayUnitDistance(v: number, keyIndex?: number, calibration?: HMK_Calibration, decimal = 2) {
  return ((v * getSwitchDistanceMM(keyIndex, calibration)) / SWITCH_DISTANCE_UNIT).toFixed(decimal)
}

export function displayDistance(v: number, keyIndex?: number, calibration?: HMK_Calibration, decimal = 2) {
  return displayUnitDistance(distanceToUnit(v), keyIndex, calibration, decimal)
}
