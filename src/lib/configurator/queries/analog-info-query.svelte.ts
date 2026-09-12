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
import type { HMK_AnalogInfo } from "$lib/libhmk/commands"
import { Context, resource, type ResourceReturn } from "runed"

export class AnalogInfoQuery {
  analogInfo: ResourceReturn<HMK_AnalogInfo[]>
  enabled = $state(false)
  samplingRate = $state<"normal" | "fast">("normal")

  #keyboard = keyboardContext.get()
  #timer: ReturnType<typeof setTimeout> | null = null

  constructor() {
    this.analogInfo = resource(
      () => ({ enabled: this.enabled, rate: this.samplingRate }),
      async ({ enabled, rate }) => {
        if (this.#timer) {
          clearTimeout(this.#timer)
          this.#timer = null
        }
        if (!enabled) return this.analogInfo.current

        try {
          const ret = await this.#keyboard.analogInfo()
          return ret
        } finally {
          if (this.enabled) {
            const interval = rate === "fast" ? 1000 / 200 : 1000 / 60
            this.#timer = setTimeout(
              () => this.analogInfo.refetch(),
              interval,
            )
          }
        }
      },
      { lazy: true },
    )
  }

  async recalibrate() {
    try {
      await this.#keyboard.recalibrate()
    } catch (err) {
      console.error(err)
    } finally {
      if (this.#timer) {
        clearTimeout(this.#timer)
        this.#timer = null
      }
      this.analogInfo.refetch()
    }
  }
}

export const analogInfoQueryContext = new Context<AnalogInfoQuery>(
  "hmk-analog-info-query",
)
