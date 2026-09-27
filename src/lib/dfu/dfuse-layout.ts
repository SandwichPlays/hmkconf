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

export type DfuSePage = { address: number; size: number }
export type DfuSeLayout = { startAddress: number; pages: DfuSePage[] }

/**
 * Parse a DfuSe interface alt-setting name string into a flash page layout.
 *
 * Example: "@Internal Flash /0x08000000/16*002Kg,112*002Kg"
 *   - "@<description>" — DfuSe marker + human name
 *   - "/0x08000000"    — region start address
 *   - "/16*002Kg,..."  — comma-separated sectors: <count>*<size><unit><type>
 *
 * Returns null if the string is not a DfuSe layout.
 */
export function parseDfuSeLayout(name: string | undefined): DfuSeLayout | null {
  if (!name || !name.startsWith("@")) return null
  const parts = name.split("/")
  if (parts.length < 3) return null

  const startAddress = parseInt(parts[1], 16)
  if (Number.isNaN(startAddress)) return null

  const pages: DfuSePage[] = []
  let addr = startAddress
  for (const seg of parts[2].split(",")) {
    const m = seg.trim().match(/^(\d+)\s*\*\s*(\d+)\s*([KM ])?/)
    if (!m) continue
    const count = parseInt(m[1], 10)
    let size = parseInt(m[2], 10)
    const unit = m[3]
    if (unit === "K") size *= 1024
    else if (unit === "M") size *= 1024 * 1024
    for (let i = 0; i < count; i++) {
      pages.push({ address: addr, size })
      addr += size
    }
  }
  return pages.length > 0 ? { startAddress, pages } : null
}

/**
 * Start addresses of every page whose extent overlaps [start, end). Used to
 * erase exactly the pages that will be written, leaving other flash regions
 * (e.g. the EEPROM-emulated settings) untouched.
 */
export function pagesInRange(
  layout: DfuSeLayout,
  start: number,
  end: number,
): number[] {
  const result: number[] = []
  for (const p of layout.pages) {
    if (p.address < end && p.address + p.size > start) result.push(p.address)
  }
  return result
}
