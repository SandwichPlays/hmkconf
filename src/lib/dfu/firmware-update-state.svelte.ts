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

// Shared flag indicating a Web DFU firmware update is in progress.
//
// When the keyboard reboots into its ROM DFU bootloader, the WebHID device
// disconnects. Without this flag the app would treat that as a normal
// disconnect and return to the landing screen, unmounting the firmware update
// dialog (and its DFU flash state) mid-flow. The landing page checks this flag
// to keep the configurator mounted while the WebUSB DFU flash proceeds.
export const firmwareUpdateState = $state({ inProgress: false })
