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

export enum DFU_Request {
  DETACH = 0,
  DNLOAD = 1,
  UPLOAD = 2,
  GETSTATUS = 3,
  CLRSTATUS = 4,
  GETSTATE = 5,
  ABORT = 6,
}

export enum DFU_State {
  appIDLE = 0,
  appDETACH = 1,
  dfuIDLE = 2,
  dfuDNLOAD_SYNC = 3,
  dfuDNBUSY = 4,
  dfuDNLOAD_IDLE = 5,
  dfuMANIFEST_SYNC = 6,
  dfuMANIFEST = 7,
  dfuMANIFEST_WAIT_RESET = 8,
  dfuUPLOAD_IDLE = 9,
  dfuERROR = 10,
}

export enum DFU_Status {
  OK = 0x00,
  errTARGET = 0x01,
  errFILE = 0x02,
  errWRITE = 0x03,
  errERASE = 0x04,
  errCHECK_ERASED = 0x05,
  errPROG = 0x06,
  errVERIFY = 0x07,
  errADDRESS = 0x08,
  errNOTDONE = 0x09,
  errFIRMWARE = 0x0a,
  errVENDOR = 0x0b,
  errUSBR = 0x0c,
  errPOR = 0x0d,
  errUNKNOWN = 0x0e,
  errSTALLEDPKT = 0x0f,
}

export type DFU_StatusResponse = {
  status: DFU_Status
  pollTimeout: number
  state: DFU_State
}

export const DFU_CLASS = 0xfe
export const DFU_SUBCLASS = 0x01
export const DFU_PROTOCOL_RUNTIME = 0x01
export const DFU_PROTOCOL_DFU = 0x02

// DfuSe (ST/Artery DFU extension) command bytes, sent via DFU_DNLOAD with
// wBlockNum = 0. AT32 ROM bootloaders use DfuSe rather than plain DFU 1.1.
export const DFUSE_SET_ADDRESS = 0x21
export const DFUSE_ERASE = 0x41
