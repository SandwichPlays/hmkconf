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

import { DataViewReader } from "$lib/data-view-reader"
import type { Commander } from "$lib/keyboard/commander"
import { HMK_Command, type HMK_ScanRate } from "."

export async function getScanRate(commander: Commander): Promise<HMK_ScanRate> {
  const reader = new DataViewReader(
    await commander.sendCommand({
      command: HMK_Command.SCAN_RATE,
    }),
  )

  return {
    evalRateHz: reader.uint32(),
    sweepRateHz: reader.uint32(),
    sweepPeriodUs: reader.uint16(),
    evalMinUs: reader.uint16(),
    evalMaxUs: reader.uint16(),
    evalAvgUs: reader.uint16(),
  }
}
