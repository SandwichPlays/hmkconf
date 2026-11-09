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
import type {
  GetRGBColorsParams,
  GetRGBOptionsParams,
  SetRGBColorsParams,
  SetRGBOptionsParams,
} from "$lib/keyboard"
import type { Commander } from "$lib/keyboard/commander"
import type { KeyboardMetadata } from "$lib/keyboard/metadata"
import { HMK_Command } from "."
import {
  defaultRGBColor,
  defaultRGBOptions,
  type HMK_RGBColor,
  type HMK_RGBDirection,
  type HMK_RGBMode,
  type HMK_RGBOptions,
} from "../rgb"

export async function getRGBOptions(
  commander: Commander,
  { profile }: GetRGBOptionsParams,
): Promise<HMK_RGBOptions> {
  try {
    const reader = new DataViewReader(
      await commander.sendCommand({
        command: HMK_Command.GET_RGB_OPTIONS,
        payload: [profile],
      }),
    )

    const mode = reader.uint8() as HMK_RGBMode
    const brightness = reader.uint8()
    const speed = reader.uint8()
    const direction = reader.uint8() as HMK_RGBDirection
    const color1 = { r: reader.uint8(), g: reader.uint8(), b: reader.uint8() }
    const color2 = { r: reader.uint8(), g: reader.uint8(), b: reader.uint8() }

    return {
      mode,
      brightness,
      speed,
      direction,
      color1,
      color2,
    }
  } catch {
    return structuredClone(defaultRGBOptions)
  }
}

export async function setRGBOptions(
  commander: Commander,
  {
    profile,
    data: { mode, brightness, speed, direction, color1, color2 },
  }: SetRGBOptionsParams,
) {
  await commander.sendCommand({
    command: HMK_Command.SET_RGB_OPTIONS,
    payload: [
      profile,
      mode,
      brightness,
      speed,
      direction,
      color1.r,
      color1.g,
      color1.b,
      color2.r,
      color2.g,
      color2.b,
    ],
  })
}

const GET_RGB_COLORS_MAX_ENTRIES = 21

export async function getRGBColors(
  commander: Commander,
  metadata: KeyboardMetadata,
  { profile }: GetRGBColorsParams,
): Promise<HMK_RGBColor[]> {
  const count = Math.max(metadata.numKeys, metadata.rgb?.numLeds ?? 0)
  try {
    const ret: HMK_RGBColor[] = []
    for (let i = 0; i < count; i += GET_RGB_COLORS_MAX_ENTRIES) {
      const reader = new DataViewReader(
        await commander.sendCommand({
          command: HMK_Command.GET_RGB_COLORS,
          payload: [profile, i],
        }),
      )

      for (let j = 0; j < GET_RGB_COLORS_MAX_ENTRIES && i + j < count; j++) {
        ret.push({
          r: reader.uint8(),
          g: reader.uint8(),
          b: reader.uint8(),
        })
      }
    }
    return ret
  } catch {
    return Array.from({ length: count }, () => ({ ...defaultRGBColor }))
  }
}

const SET_RGB_COLORS_MAX_ENTRIES = 20

export async function setRGBColors(
  commander: Commander,
  { profile, offset, data }: SetRGBColorsParams,
) {
  for (let i = 0; i < data.length; i += SET_RGB_COLORS_MAX_ENTRIES) {
    const part = data.slice(i, i + SET_RGB_COLORS_MAX_ENTRIES)
    await commander.sendCommand({
      command: HMK_Command.SET_RGB_COLORS,
      payload: [
        profile,
        offset + i,
        part.length,
        ...part.flatMap(({ r, g, b }) => [r, g, b]),
      ],
    })
  }
}

