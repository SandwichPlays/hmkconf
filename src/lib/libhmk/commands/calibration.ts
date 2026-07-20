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

import { DataViewReader } from "$lib/data-view-reader"
import { uint16ToUInt8s } from "$lib/integer"
import type { SetCalibrationParams } from "$lib/keyboard"
import type { Commander } from "$lib/keyboard/commander"
import { HMK_Command } from "."
import type { HMK_Calibration } from ".."

export async function recalibrate(commander: Commander) {
  await commander.sendCommand({ command: HMK_Command.RECALIBRATE })
}

export async function getCalibration(
  commander: Commander,
  numKeys: number,
): Promise<HMK_Calibration> {
  const reader = new DataViewReader(
    await commander.sendCommand({ command: HMK_Command.GET_CALIBRATION }),
  )

  const initialRestValue = reader.uint16()
  const initialBottomOutThreshold = reader.uint16()
  const switchTravel: number[] = []
  for (let i = 0; i < numKeys; i++) {
    switchTravel.push(reader.uint8())
  }

  return {
    initialRestValue,
    initialBottomOutThreshold,
    switchTravel,
  }
}

export async function setCalibration(
  commander: Commander,
  {
    data: { initialRestValue, initialBottomOutThreshold, switchTravel },
  }: SetCalibrationParams,
  numKeys: number,
) {
  await commander.sendCommand({
    command: HMK_Command.SET_CALIBRATION,
    payload: [
      ...uint16ToUInt8s(initialRestValue),
      ...uint16ToUInt8s(initialBottomOutThreshold),
      ...switchTravel.slice(0, numKeys),
    ],
  })
}

export async function saveCalibrationThreshold(commander: Commander) {
  await commander.sendCommand({
    command: HMK_Command.SAVE_CALIBRATION_THRESHOLD,
    payload: [],
  })
}

export async function startManualCalibration(
  commander: Commander,
  keys: number[] = [],
) {
  await commander.sendCommand({
    command: HMK_Command.START_MANUAL_CALIBRATION,
    payload: [keys.length, ...keys],
  })
}

export async function finishManualCalibration(
  commander: Commander,
  save = true,
) {
  await commander.sendCommand({
    command: HMK_Command.FINISH_MANUAL_CALIBRATION,
    payload: [save ? 1 : 0],
  })
}
