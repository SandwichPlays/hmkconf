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

import { DFU_CLASS, DFU_SUBCLASS } from "./dfu"
import { DFUDevice, DFUDeviceError } from "./dfu-device"

type DFUInterface = {
  interfaceNumber: number
  alternateSetting: number
  interfaceName?: string
}

function findDFUInterface(device: USBDevice): DFUInterface | null {
  let first: DFUInterface | null = null
  for (const config of device.configurations) {
    for (const iface of config.interfaces) {
      for (const alt of iface.alternates) {
        if (
          alt.interfaceClass === DFU_CLASS &&
          alt.interfaceSubclass === DFU_SUBCLASS
        ) {
          const candidate: DFUInterface = {
            interfaceNumber: iface.interfaceNumber,
            alternateSetting: alt.alternateSetting,
            interfaceName: alt.interfaceName ?? undefined,
          }
          // Prefer the DfuSe "Internal Flash" alt-setting (where the firmware
          // lives); fall back to the first DFU interface otherwise.
          if (alt.interfaceName?.startsWith("@Internal Flash")) return candidate
          if (!first) first = candidate
        }
      }
    }
  }
  return first
}

export async function connectDFUDevice(): Promise<DFUDevice> {
  if (!navigator.usb) {
    throw new DFUDeviceError("WebUSB is not supported in this browser")
  }

  const device = await navigator.usb.requestDevice({
    filters: [{ classCode: DFU_CLASS, subclassCode: DFU_SUBCLASS }],
  })

  const iface = findDFUInterface(device)
  if (iface === null) {
    throw new DFUDeviceError("No DFU interface found on the selected device")
  }

  const dfuDevice = new DFUDevice(
    device,
    iface.interfaceNumber,
    iface.alternateSetting,
    iface.interfaceName,
  )
  await dfuDevice.open()
  return dfuDevice
}

export function isWebUSBSupported(): boolean {
  return !!navigator.usb
}
