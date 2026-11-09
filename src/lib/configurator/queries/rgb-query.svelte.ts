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

import {
  keyboardContext,
  type SetRGBColorsParams,
  type SetRGBOptionsParams,
} from "$lib/keyboard"
import {
  defaultRGBOptions,
  type HMK_RGBColor,
  type HMK_RGBOptions,
} from "$lib/libhmk/rgb"
import { Context, resource, type ResourceReturn } from "runed"
import { optimisticUpdate } from "."
import { globalStateContext } from "../context.svelte"

export class RGBQuery {
  rgbOptions: ResourceReturn<HMK_RGBOptions>
  rgbColors: ResourceReturn<HMK_RGBColor[]>

  #keyboard = keyboardContext.get()
  #profile = $derived(globalStateContext.get().profile)

  constructor() {
    this.rgbOptions = resource(
      () => ({ profile: this.#profile }),
      async (p) => {
        if (!this.#keyboard.metadata.rgb) {
          return structuredClone(defaultRGBOptions)
        }
        return this.#keyboard.getRGBOptions(p)
      },
    )
    this.rgbColors = resource(
      () => ({ profile: this.#profile }),
      async (p) => {
        if (!this.#keyboard.metadata.rgb) {
          return []
        }
        return this.#keyboard.getRGBColors(p)
      },
    )
  }

  async setOptions(params: Omit<SetRGBOptionsParams, "profile">) {
    const { data } = params
    await optimisticUpdate({
      resource: this.rgbOptions,
      optimisticFn: () => data,
      updateFn: () =>
        this.#keyboard.setRGBOptions({ ...params, profile: this.#profile }),
    })
  }

  async setColors(params: Omit<SetRGBColorsParams, "profile">) {
    const { offset, data } = params
    await optimisticUpdate({
      resource: this.rgbColors,
      optimisticFn: (current) => {
        const ret = [...current]
        for (let i = 0; i < data.length; i++) {
          ret[offset + i] = data[i]
        }
        return ret
      },
      updateFn: () =>
        this.#keyboard.setRGBColors({ ...params, profile: this.#profile }),
    })
  }

  async setManyColors(updates: { offset: number; data: HMK_RGBColor[] }[]) {
    await optimisticUpdate({
      resource: this.rgbColors,
      optimisticFn: (current) => {
        const ret = [...current]
        for (const { offset, data } of updates) {
          for (let i = 0; i < data.length; i++) {
            ret[offset + i] = data[i]
          }
        }
        return ret
      },
      updateFn: async () => {
        for (const { offset, data } of updates) {
          await this.#keyboard.setRGBColors({
            offset,
            data,
            profile: this.#profile,
          })
        }
      },
    })
  }
}

export const rgbQueryContext = new Context<RGBQuery>("hmk-rgb-query")

