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

import type { Keyboard } from "$lib/keyboard"
import { connectDFUDevice } from "./dfu-connect"
import type { DFUDevice } from "./dfu-device"

export type DFUFlashStep =
  | { type: "idle" }
  | { type: "entering-bootloader" }
  | { type: "waiting-for-dfu" }
  | { type: "connected" }
  | { type: "flashing"; progress: number }
  | { type: "complete" }
  | { type: "error"; message: string }

export class DFUFlashManager {
  step: DFUFlashStep = $state({ type: "idle" })
  #device: DFUDevice | null = null

  reset() {
    this.step = { type: "idle" }
    this.#device = null
  }

  async enterBootloader(keyboard: Keyboard) {
    this.step = { type: "entering-bootloader" }
    try {
      await keyboard.bootloader()
    } catch {
      // Device disconnects after bootloader command — expected
    }
    this.step = { type: "waiting-for-dfu" }
  }

  async connectDFU() {
    try {
      this.#device = await connectDFUDevice()
      this.step = { type: "connected" }
    } catch (err) {
      this.step = {
        type: "error",
        message:
          err instanceof Error ? err.message : "Failed to connect DFU device",
      }
    }
  }

  async flash(firmware: ArrayBuffer) {
    if (!this.#device) {
      this.step = { type: "error", message: "No DFU device connected" }
      return
    }

    this.step = { type: "flashing", progress: 0 }
    try {
      await this.#device.flash(firmware, {
        onProgress: (bytesSent, totalBytes) => {
          this.step = {
            type: "flashing",
            progress: bytesSent / totalBytes,
          }
        },
      })
      this.step = { type: "complete" }
    } catch (err) {
      this.step = {
        type: "error",
        message: err instanceof Error ? err.message : "Firmware flash failed",
      }
    } finally {
      try {
        await this.#device?.close()
      } catch {
        // Ignore close errors
      }
      this.#device = null
    }
  }
}
