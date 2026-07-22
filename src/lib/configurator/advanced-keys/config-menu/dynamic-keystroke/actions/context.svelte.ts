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

import { bitmapToIntervals } from "$lib/configurator/lib/advanced-keys"
import { HMK_DKSAction } from "$lib/libhmk/advanced-keys"
import { Context } from "runed"

export type DKSActionsStateProps = {
  bitmap: HMK_DKSAction[]
  updateBitmap: (bitmap: HMK_DKSAction[]) => void
}

export class DKSActionsState {
  #props: () => DKSActionsStateProps
  currentBitmap = $state<HMK_DKSAction[]>(Array(4).fill(HMK_DKSAction.HOLD))

  constructor(props: () => DKSActionsStateProps) {
    this.#props = props

    $effect(() => {
      this.currentBitmap = this.bitmap
    })
  }

  get bitmap() {
    return this.#props().bitmap
  }

  get intervals() {
    return bitmapToIntervals(this.bitmap)
  }

  get currentIntervals() {
    return bitmapToIntervals(this.currentBitmap)
  }

  get updateBitmap() {
    return this.#props().updateBitmap
  }
}

export const dksActionsStateContext = new Context<DKSActionsState>(
  "hmk-dks-actions-state",
)
