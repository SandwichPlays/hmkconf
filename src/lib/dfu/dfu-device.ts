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
  DFU_Request,
  DFU_State,
  DFU_Status,
  DFUSE_ERASE,
  DFUSE_SET_ADDRESS,
  type DFU_StatusResponse,
} from "./dfu"
import {
  pagesInRange,
  parseDfuSeLayout,
  type DfuSeLayout,
} from "./dfuse-layout"

export class DFUDeviceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "DFUDeviceError"
  }
}

export type DFUFlashOptions = {
  transferSize?: number
  onProgress?: (bytesSent: number, totalBytes: number) => void
}

// 32-bit little-endian byte array, used for DfuSe address/erase command operands.
function le32(value: number): number[] {
  return [
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  ]
}

export class DFUDevice {
  #device: USBDevice
  #interfaceNumber: number
  #alternateSetting: number
  #interfaceName?: string
  #transferSize = 2048
  // Non-null when the device speaks the DfuSe (ST/Artery) extension. Detected
  // from the USB descriptors in open() (e.g. AT32 ROM bootloaders).
  #dfuseLayout: DfuSeLayout | null = null

  constructor(
    device: USBDevice,
    interfaceNumber: number,
    alternateSetting = 0,
    interfaceName?: string,
  ) {
    this.#device = device
    this.#interfaceNumber = interfaceNumber
    this.#alternateSetting = alternateSetting
    this.#interfaceName = interfaceName
  }

  async open() {
    await this.#device.open()
    if (this.#device.configuration === null) {
      await this.#device.selectConfiguration(1)
    }
    await this.#device.claimInterface(this.#interfaceNumber)
    // DfuSe selects the target memory region (internal flash, option bytes, …)
    // via the alt setting, so always select the one we connected with.
    await this.#device.selectAlternateInterface(
      this.#interfaceNumber,
      this.#alternateSetting,
    )
    await this.#detectDfuSe()
  }

  // Read the USB descriptors directly to detect DfuSe and obtain the flash
  // layout + transfer size. WebUSB frequently leaves USBAlternateInterface.
  // interfaceName undefined, so we cannot rely on it.
  async #detectDfuSe() {
    try {
      const cfg = await this.#readConfigDescriptor()
      if (!cfg) {
        this.#dfuseLayout = parseDfuSeLayout(this.#interfaceName)
        return
      }
      const info = this.#parseConfigForDfu(cfg)
      if (info.wTransferSize > 0) this.#transferSize = info.wTransferSize
      let layoutStr = this.#interfaceName
      if (!layoutStr && info.iInterface > 0) {
        layoutStr = await this.#readStringDescriptor(info.iInterface)
      }
      this.#dfuseLayout = parseDfuSeLayout(layoutStr)
    } catch {
      this.#dfuseLayout = parseDfuSeLayout(this.#interfaceName)
    }
  }

  async #readConfigDescriptor(): Promise<DataView | null> {
    const get = (length: number) =>
      this.#device.controlTransferIn(
        {
          requestType: "standard",
          recipient: "device",
          request: 0x06, // GET_DESCRIPTOR
          value: 0x0200, // CONFIGURATION descriptor, index 0
          index: 0,
        },
        length,
      )
    const head = await get(9)
    if (head.status !== "ok" || !head.data || head.data.byteLength < 4) {
      return null
    }
    const total = head.data.getUint16(2, true)
    const full = await get(total)
    return full.status === "ok" && full.data ? full.data : null
  }

  // Walk the configuration descriptor for the DFU functional descriptor
  // (wTransferSize, bcdDFUVersion) and the iInterface string index of the
  // interface/alt we are using.
  #parseConfigForDfu(cfg: DataView) {
    let iInterface = 0
    let bcdDFUVersion = 0
    let wTransferSize = 0
    let i = 0
    while (i + 1 < cfg.byteLength) {
      const bLength = cfg.getUint8(i)
      if (bLength === 0) break
      const bType = cfg.getUint8(i + 1)
      if (bType === 0x04 && i + 8 < cfg.byteLength) {
        // interface descriptor
        const bInterfaceNumber = cfg.getUint8(i + 2)
        const bAlternateSetting = cfg.getUint8(i + 3)
        if (
          bInterfaceNumber === this.#interfaceNumber &&
          bAlternateSetting === this.#alternateSetting
        ) {
          iInterface = cfg.getUint8(i + 8)
        }
      } else if (bType === 0x21 && i + 8 < cfg.byteLength) {
        // DFU functional descriptor
        wTransferSize = cfg.getUint16(i + 5, true)
        bcdDFUVersion = cfg.getUint16(i + 7, true)
      }
      i += bLength
    }
    return { iInterface, bcdDFUVersion, wTransferSize }
  }

  async #readStringDescriptor(
    index: number,
    langId = 0x0409,
  ): Promise<string | undefined> {
    if (!index) return undefined
    const r = await this.#device.controlTransferIn(
      {
        requestType: "standard",
        recipient: "device",
        request: 0x06, // GET_DESCRIPTOR
        value: 0x0300 | index, // STRING descriptor
        index: langId,
      },
      255,
    )
    if (r.status !== "ok" || !r.data || r.data.byteLength < 2) return undefined
    let s = ""
    for (let i = 2; i + 1 < r.data.byteLength; i += 2) {
      s += String.fromCharCode(r.data.getUint16(i, true))
    }
    return s
  }

  async close() {
    try {
      await this.#device.releaseInterface(this.#interfaceNumber)
      await this.#device.close()
    } catch {
      // Device may already be disconnected after manifest
    }
  }

  async getStatus(): Promise<DFU_StatusResponse> {
    let result = await this.#device.controlTransferIn(
      {
        requestType: "class",
        recipient: "interface",
        request: DFU_Request.GETSTATUS,
        value: 0,
        index: this.#interfaceNumber,
      },
      6,
    )
    // A stalled GETSTATUS usually means the device is in an error state; clear
    // it once and retry before giving up.
    if (result.status === "stall") {
      try {
        await this.clearStatus()
      } catch {
        /* ignore */
      }
      result = await this.#device.controlTransferIn(
        {
          requestType: "class",
          recipient: "interface",
          request: DFU_Request.GETSTATUS,
          value: 0,
          index: this.#interfaceNumber,
        },
        6,
      )
    }
    if (result.status !== "ok" || !result.data || result.data.byteLength < 6) {
      throw new DFUDeviceError(
        `Failed to get DFU status (transfer=${result.status}, len=${result.data?.byteLength ?? 0}, iface=${this.#interfaceNumber})`,
      )
    }
    const data = result.data
    return {
      status: data.getUint8(0) as DFU_Status,
      pollTimeout:
        data.getUint8(1) | (data.getUint8(2) << 8) | (data.getUint8(3) << 16),
      state: data.getUint8(4) as DFU_State,
    }
  }

  async clearStatus() {
    await this.#device.controlTransferOut({
      requestType: "class",
      recipient: "interface",
      request: DFU_Request.CLRSTATUS,
      value: 0,
      index: this.#interfaceNumber,
    })
  }

  async download(blockNum: number, data: ArrayBuffer) {
    await this.#device.controlTransferOut(
      {
        requestType: "class",
        recipient: "interface",
        request: DFU_Request.DNLOAD,
        value: blockNum,
        index: this.#interfaceNumber,
      },
      data,
    )
  }

  async abort() {
    await this.#device.controlTransferOut({
      requestType: "class",
      recipient: "interface",
      request: DFU_Request.ABORT,
      value: 0,
      index: this.#interfaceNumber,
    })
  }

  async #pollUntilIdle() {
    let status = await this.getStatus()
    while (status.state === DFU_State.dfuDNBUSY) {
      if (status.pollTimeout > 0) {
        await new Promise((r) => setTimeout(r, status.pollTimeout))
      }
      status = await this.getStatus()
    }
    return status
  }

  async #ensureIdle() {
    let status = await this.getStatus()
    if (status.state === DFU_State.dfuERROR) {
      await this.clearStatus()
      status = await this.getStatus()
    }
    if (status.state !== DFU_State.dfuIDLE) {
      await this.abort()
      status = await this.getStatus()
    }
    if (status.state !== DFU_State.dfuIDLE) {
      throw new DFUDeviceError(
        `Cannot enter dfuIDLE state (current: ${DFU_State[status.state]})`,
      )
    }
  }

  // DfuSe special command (Set Address Pointer / Erase): a DFU_DNLOAD to
  // wBlockNum 0 whose payload starts with the command byte. The first
  // GETSTATUS triggers execution; we then poll until the device is idle again.
  async #dfuseCommand(bytes: number[]) {
    await this.download(0, new Uint8Array(bytes).buffer)
    const status = await this.#pollUntilIdle()
    if (status.status !== DFU_Status.OK) {
      throw new DFUDeviceError(
        `DfuSe command failed: ${DFU_Status[status.status]}`,
      )
    }
    return status
  }

  async flash(firmware: ArrayBuffer, options: DFUFlashOptions = {}) {
    if (this.#dfuseLayout) {
      await this.#flashDfuSe(firmware, options)
    } else {
      await this.#flashPlain(firmware, options)
    }
  }

  // DfuSe flash flow for AT32/STM32-style ROM bootloaders: erase only the pages
  // covering the firmware (so other flash regions such as the EEPROM-emulated
  // settings are preserved), set the address pointer, stream data blocks, then
  // leave DFU so the device boots the new firmware.
  async #flashDfuSe(firmware: ArrayBuffer, options: DFUFlashOptions) {
    const { transferSize = this.#transferSize, onProgress } = options
    const layout = this.#dfuseLayout!
    const start = layout.startAddress
    const totalBytes = firmware.byteLength

    await this.#ensureIdle()

    // 1. Erase the pages we are about to write (page-granular, not mass erase).
    for (const pageAddr of pagesInRange(layout, start, start + totalBytes)) {
      await this.#dfuseCommand([DFUSE_ERASE, ...le32(pageAddr)])
    }

    // 2. Set the address pointer to the firmware start.
    await this.#dfuseCommand([DFUSE_SET_ADDRESS, ...le32(start)])

    // 3. Stream data. wBlockNum starts at 2; the device writes each block at
    //    address = pointer + (wBlockNum - 2) * transferSize.
    let bytesSent = 0
    let blockNum = 2
    while (bytesSent < totalBytes) {
      const chunkSize = Math.min(transferSize, totalBytes - bytesSent)
      const chunk = firmware.slice(bytesSent, bytesSent + chunkSize)

      await this.download(blockNum, chunk)
      const status = await this.#pollUntilIdle()
      if (
        status.state !== DFU_State.dfuDNLOAD_IDLE &&
        status.state !== DFU_State.dfuIDLE
      ) {
        throw new DFUDeviceError(
          `DfuSe write failed at 0x${(start + bytesSent).toString(16)}: ` +
            `${DFU_State[status.state]} (${DFU_Status[status.status]})`,
        )
      }

      bytesSent += chunkSize
      blockNum++
      onProgress?.(bytesSent, totalBytes)
    }

    // 4. Leave DFU: set the address pointer, then a zero-length download
    //    triggers manifestation and the device resets into the new firmware.
    await this.#dfuseCommand([DFUSE_SET_ADDRESS, ...le32(start)])
    try {
      await this.download(0, new ArrayBuffer(0))
      await this.#pollUntilIdle()
    } catch {
      // The device resets and disconnects on leave — expected.
    }
  }

  // Plain DFU 1.1 flash flow (sequential DNLOAD blocks). Kept for devices that
  // are not DfuSe.
  async #flashPlain(firmware: ArrayBuffer, options: DFUFlashOptions) {
    const { transferSize = this.#transferSize, onProgress } = options
    const totalBytes = firmware.byteLength

    await this.#ensureIdle()

    let bytesSent = 0
    let blockNum = 0

    while (bytesSent < totalBytes) {
      const chunkSize = Math.min(transferSize, totalBytes - bytesSent)
      const chunk = firmware.slice(bytesSent, bytesSent + chunkSize)

      await this.download(blockNum, chunk)
      const status = await this.#pollUntilIdle()

      if (
        status.state !== DFU_State.dfuDNLOAD_IDLE &&
        status.state !== DFU_State.dfuIDLE
      ) {
        throw new DFUDeviceError(
          `Unexpected state after download: ${DFU_State[status.state]} (status: ${DFU_Status[status.status]})`,
        )
      }

      bytesSent += chunkSize
      blockNum++
      onProgress?.(bytesSent, totalBytes)
    }

    // Send zero-length download to signal end
    await this.download(blockNum, new ArrayBuffer(0))

    try {
      const status = await this.#pollUntilIdle()
      if (
        status.state !== DFU_State.dfuMANIFEST_WAIT_RESET &&
        status.state !== DFU_State.dfuIDLE &&
        status.state !== DFU_State.dfuMANIFEST
      ) {
        throw new DFUDeviceError(
          `Unexpected final state: ${DFU_State[status.state]}`,
        )
      }
    } catch {
      // Some devices disconnect immediately after manifest — this is expected
    }
  }
}
