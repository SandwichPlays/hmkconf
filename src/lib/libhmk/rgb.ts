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

import { uint8Schema } from "$lib/integer"
import z from "zod"

export enum HMK_RGBMode {
  OFF = 0,
  SOLID = 1,
  PER_KEY = 2,
  BREATHING = 3,
  RAINBOW = 4,
  WAVE = 5,
  REACTIVE = 6,
  ANALOG_DEPTH = 7,
}

export enum HMK_RGBDirection {
  LEFT_TO_RIGHT = 0,
  RIGHT_TO_LEFT = 1,
  TOP_TO_BOTTOM = 2,
  BOTTOM_TO_TOP = 3,
  CENTER_OUT = 4,
}

export const hmkRGBColorSchema = z.object({
  r: uint8Schema,
  g: uint8Schema,
  b: uint8Schema,
})

export type HMK_RGBColor = z.infer<typeof hmkRGBColorSchema>

export const hmkRGBOptionsSchema = z.object({
  mode: z.enum(HMK_RGBMode),
  brightness: uint8Schema,
  speed: uint8Schema,
  direction: z.enum(HMK_RGBDirection),
  color1: hmkRGBColorSchema,
  color2: hmkRGBColorSchema,
})

export type HMK_RGBOptions = z.infer<typeof hmkRGBOptionsSchema>

export const defaultRGBColor: HMK_RGBColor = {
  r: 0,
  g: 180,
  b: 255,
}

export const defaultRGBOptions: HMK_RGBOptions = {
  mode: HMK_RGBMode.RAINBOW,
  brightness: 200,
  speed: 128,
  direction: HMK_RGBDirection.LEFT_TO_RIGHT,
  color1: { r: 0, g: 180, b: 255 },
  color2: { r: 255, g: 0, b: 128 },
}

export function rgbToHex({ r, g, b }: HMK_RGBColor): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0")
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function hexToRgb(hex: string): HMK_RGBColor {
  const clean = hex.replace(/^#/, "")
  if (clean.length !== 6) return { ...defaultRGBColor }
  const num = parseInt(clean, 16)
  if (Number.isNaN(num)) return { ...defaultRGBColor }
  return {
    r: (num >> 16) & 0xff,
    g: (num >> 8) & 0xff,
    b: num & 0xff,
  }
}

