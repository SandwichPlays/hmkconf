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

import { HMK_Command } from "./index"
import type { Commander } from "$lib/keyboard/commander"

export const SWITCH_LUT_SIZE = 1024
export const SWITCH_LUT_CHUNK_SIZE = 30

export async function setSwitchLut(
  commander: Commander,
  lut: number[],
): Promise<void> {
  const totalChunks = Math.ceil(lut.length / SWITCH_LUT_CHUNK_SIZE) // 35 chunks
  for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
    const offset = chunkIdx * SWITCH_LUT_CHUNK_SIZE
    const chunk = lut.slice(offset, offset + SWITCH_LUT_CHUNK_SIZE)
    const payload: number[] = [chunkIdx, chunk.length, 0]
    for (const val of chunk) {
      payload.push(val & 0xff, (val >> 8) & 0xff)
    }
    // Pad payload to 63 bytes (report size minus 1 byte command)
    while (payload.length < 63) {
      payload.push(0)
    }

    await commander.sendCommand({
      command: HMK_Command.SET_SWITCH_LUT,
      payload,
    })
  }
}

export async function getSwitchLut(commander: Commander): Promise<number[]> {
  const totalChunks = Math.ceil(SWITCH_LUT_SIZE / SWITCH_LUT_CHUNK_SIZE)
  const lut: number[] = []

  for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
    const payload: number[] = [chunkIdx]
    while (payload.length < 63) {
      payload.push(0)
    }

    const response = await commander.sendCommand({
      command: HMK_Command.GET_SWITCH_LUT,
      payload,
    })

    const count = response.getUint8(1)
    for (let i = 0; i < count; i++) {
      const val = response.getUint16(3 + i * 2, true)
      lut.push(val)
    }
  }

  return lut
}
