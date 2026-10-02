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

import { HMK_Command, HMK_RAW_HID_EP_SIZE } from "$lib/libhmk/commands"
import { TaskQueue } from "$lib/task-queue"

export class Commander {
  hidDevice: HIDDevice
  #taskQueue = new TaskQueue()
  #responseQueue: DataView[] = []
  #pendingResolve: ((data: DataView) => void) | null = null
  #pendingCommand: HMK_Command | null = null

  constructor(hidDevice: HIDDevice) {
    this.hidDevice = hidDevice
    this.hidDevice.oninputreport = (e) => {
      if (e.data.byteLength === HMK_RAW_HID_EP_SIZE) {
        const cmd = e.data.getUint8(0)
        if (this.#pendingResolve && this.#pendingCommand === cmd) {
          const resolve = this.#pendingResolve
          this.#pendingResolve = null
          this.#pendingCommand = null
          resolve(new DataView(e.data.buffer.slice(1)))
        } else if (cmd !== HMK_Command.ANALOG_INFO) {
          this.#responseQueue.push(e.data)
        }
      } else {
        console.error(
          `Unexpected input report length: ${e.data.byteLength} bytes. Expected ${HMK_RAW_HID_EP_SIZE} bytes.`,
        )
      }
    }
  }

  async clear() {
    this.hidDevice.oninputreport = null
    this.#pendingResolve = null
    this.#pendingCommand = null
    await this.#taskQueue.clear()
    this.#responseQueue.length = 0
  }

  sendCommand(options: {
    command: HMK_Command
    payload?: number[]
    timeout?: number
  }) {
    const { command, payload = [], timeout = 4000 } = options

    if (payload.length > HMK_RAW_HID_EP_SIZE - 1) {
      throw new Error(
        `Payload size exceeds maximum limit of ${HMK_RAW_HID_EP_SIZE - 1} bytes.`,
      )
    }

    const commandBuffer = [
      command,
      ...payload,
      ...Array(HMK_RAW_HID_EP_SIZE - payload.length - 1).fill(0),
    ]

    return this.#taskQueue.enqueue(
      (abortController) =>
        new Promise<DataView>((resolve, reject) => {
          if (command !== HMK_Command.ANALOG_INFO) {
            const idx = this.#responseQueue.findIndex(
              (r) => r.getUint8(0) === command,
            )
            if (idx !== -1) {
              const resp = this.#responseQueue.splice(idx, 1)[0]
              resolve(new DataView(resp.buffer.slice(1)))
              return
            }
          }

          let timer: ReturnType<typeof setTimeout> | null = null

          const cleanup = () => {
            if (timer) clearTimeout(timer)
            if (this.#pendingCommand === command) {
              this.#pendingResolve = null
              this.#pendingCommand = null
            }
          }

          this.#pendingCommand = command
          this.#pendingResolve = (data) => {
            cleanup()
            resolve(data)
          }

          this.hidDevice
            .sendReport(0, new Uint8Array(commandBuffer))
            .catch((err) => {
              cleanup()
              reject(err)
            })

          abortController.signal.addEventListener("abort", () => {
            cleanup()
            reject(new Error("Command was cancelled."))
          })

          timer = setTimeout(() => {
            cleanup()
            reject(new Error("Command timed out."))
          }, timeout)
        }),
    )
  }
}
