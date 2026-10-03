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
import type { HMK_ScanRate } from "$lib/libhmk/commands"
import { Context, resource, type ResourceReturn } from "runed"

export class ScanRateQuery {
  scanRate: ResourceReturn<HMK_ScanRate | undefined>
  enabled = $state(false)

  #keyboard = keyboardContext.get()
  #timer: ReturnType<typeof setTimeout> | null = null

  constructor() {
    this.scanRate = resource(
      () => this.enabled,
      async (enabled) => {
        if (this.#timer) {
          clearTimeout(this.#timer)
          this.#timer = null
        }
        if (!enabled) return this.scanRate.current

        try {
          const ret = await this.#keyboard.getScanRate()
          return ret
        } catch {
          return this.scanRate.current
        } finally {
          if (this.enabled) {
            this.#timer = setTimeout(
              () => this.scanRate.refetch(),
              500,
            )
          }
        }
      },
      { lazy: true },
    )
  }
}

export const scanRateQueryContext = new Context<ScanRateQuery>(
  "hmk-scan-rate-query",
)
