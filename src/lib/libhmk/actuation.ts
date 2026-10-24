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

import { uint16Schema } from "$lib/integer"
import z from "zod"

export const hmkActuationSchema = z.object({
  actuationPoint: uint16Schema,
  rtDown: uint16Schema,
  rtUp: uint16Schema,
  continuous: z.boolean(),
  rtDeadzoneTop: uint16Schema,
  rtDeadzoneBottom: uint16Schema,
})

export type HMK_Actuation = z.infer<typeof hmkActuationSchema>

export const DEFAULT_ACTUATION_POINT_MM = 2.0
export const DEFAULT_RT_SENSITIVITY_MM = 0.2
export const DEFAULT_RT_DEADZONE_MM = 0.1

export const DEFAULT_ACTUATION_POINT = 5556
export const DEFAULT_RT_SENSITIVITY = 556
export const DEFAULT_RT_DEADZONE = 278

export const defaultActuation: HMK_Actuation = {
  actuationPoint: DEFAULT_ACTUATION_POINT,
  rtDown: 0,
  rtUp: 0,
  continuous: false,
  rtDeadzoneTop: DEFAULT_RT_DEADZONE,
  rtDeadzoneBottom: DEFAULT_RT_DEADZONE,
}
