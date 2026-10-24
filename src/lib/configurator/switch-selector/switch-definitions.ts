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

export interface SupportedSwitch {
  id: string
  name: string
  brand: string
  baseTravelMM: number
  stemColor: string
  housingColor: string
  description: string
  measured: boolean
}

export const SUPPORTED_SWITCHES: SupportedSwitch[] = [
  {
    id: "custom",
    name: "Custom",
    brand: "Custom",
    baseTravelMM: 0,
    stemColor: "#8b5cf6",
    housingColor: "rgba(139, 92, 246, 0.15)",
    description: "Custom travel depth",
    measured: false,
  },
  {
    id: "yingying-dual-lights-max",
    name: "Yingying Dual-Lights Max",
    brand: "Yingying",
    baseTravelMM: 3.6,
    stemColor: "#14b8a6",
    housingColor: "rgba(20, 184, 166, 0.15)",
    description: "3.6mm total travel",
    measured: true,
  },
  {
    id: "linear-he-default",
    name: "Linear HE",
    brand: "Generic",
    baseTravelMM: 4.0,
    stemColor: "#f97316",
    housingColor: "rgba(249, 115, 22, 0.15)",
    description: "4.0mm total travel",
    measured: false,
  },
]

export function resolveSwitch(travelDeciMM: number = 36, switchType?: string): SupportedSwitch {
  if (switchType) {
    const found = SUPPORTED_SWITCHES.find((s) => s.id === switchType)
    if (found) return found
  }
  if (travelDeciMM <= 36) {
    return SUPPORTED_SWITCHES.find((s) => s.id === "yingying-dual-lights-max") ?? SUPPORTED_SWITCHES[1]
  }
  if (travelDeciMM === 40) {
    return SUPPORTED_SWITCHES.find((s) => s.id === "linear-he-default") ?? SUPPORTED_SWITCHES[2]
  }
  return SUPPORTED_SWITCHES.find((s) => s.id === "custom") ?? SUPPORTED_SWITCHES[0]
}

