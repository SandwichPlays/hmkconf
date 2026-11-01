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

const GET_CALIBRATION_MAX_KEYS = 59
const SET_CALIBRATION_MAX_KEYS = 57

export async function getCalibration(
  commander: Commander,
  numKeys: number,
): Promise<HMK_Calibration> {
  let initialRestValue = 0
  let initialBottomOutThreshold = 0
  const switchTravel: number[] = []

  for (let offset = 0; offset < numKeys; offset += GET_CALIBRATION_MAX_KEYS) {
    const reader = new DataViewReader(
      await commander.sendCommand({
        command: HMK_Command.GET_CALIBRATION,
        payload: [offset],
      }),
    )

    initialRestValue = reader.uint16()
    initialBottomOutThreshold = reader.uint16()
    for (
      let j = 0;
      j < GET_CALIBRATION_MAX_KEYS && offset + j < numKeys;
      j++
    ) {
      switchTravel.push(reader.uint8())
    }
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
  const total = Math.min(numKeys, switchTravel.length)
  for (let offset = 0; offset < total; offset += SET_CALIBRATION_MAX_KEYS) {
    const part = switchTravel.slice(offset, offset + SET_CALIBRATION_MAX_KEYS)
    await commander.sendCommand({
      command: HMK_Command.SET_CALIBRATION,
      payload: [
        ...uint16ToUInt8s(initialRestValue),
        ...uint16ToUInt8s(initialBottomOutThreshold),
        offset,
        part.length,
        ...part,
      ],
    })
  }
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
