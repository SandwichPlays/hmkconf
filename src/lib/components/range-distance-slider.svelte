<!--
This program is free software: you can redistribute it and/or modify it under
the terms of the GNU General Public License as published by the Free Software
Foundation, either version 3 of the License, or (at your option) any later
version.

This program is distributed in the hope that it will be useful, but WITHOUT
ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
FOR A PARTICULAR PURPOSE. See the GNU General Public License for more
details.

You should have received a copy of the GNU General Public License along with
this program. If not, see <https://www.gnu.org/licenses/>.
-->

<script lang="ts">
  import {
    distanceToMM,
    getSwitchDistanceMM,
    mmToDistance,
  } from "$lib/distance"
  import type { HMK_Calibration } from "$lib/libhmk"
  import type { ComponentProps } from "svelte"
  import CommitRangeSlider from "./commit-range-slider.svelte"

  let {
    committed = $bindable([0, 0]),
    min,
    max,
    step = 0.01,
    onCommit,
    keyIndex,
    calibration,
    display,
    mode = "sensitivity",
    ...props
  }: ComponentProps<typeof CommitRangeSlider> & {
    committed?: [number, number]
    keyIndex?: number
    calibration?: HMK_Calibration
    mode?: "sensitivity" | "deadzone"
  } = $props()

  const travel = $derived(getSwitchDistanceMM(keyIndex, calibration))
  const sliderMin = $derived(min ?? 0)
  const sliderMax = $derived(max ?? travel)
</script>

<CommitRangeSlider
  bind:committed={
    () =>
      mode === "deadzone"
        ? [
            distanceToMM(committed[0], keyIndex, calibration),
            Math.max(0, travel - distanceToMM(committed[1], keyIndex, calibration)),
          ]
        : [
            distanceToMM(committed[0], keyIndex, calibration),
            distanceToMM(committed[1], keyIndex, calibration),
          ],
    (v) =>
      (committed =
        mode === "deadzone"
          ? [
              mmToDistance(v[0], keyIndex, calibration),
              mmToDistance(Math.max(0, travel - v[1]), keyIndex, calibration),
            ]
          : [
              mmToDistance(v[0], keyIndex, calibration),
              mmToDistance(v[1], keyIndex, calibration),
            ])
  }
  display={
    display ??
    (mode === "deadzone"
      ? (v) =>
          `Top: ${v[0].toFixed(2)}mm | Bottom: ${Math.max(0, travel - v[1]).toFixed(2)}mm`
      : (v) => `Press: ${v[0].toFixed(2)}mm | Release: ${v[1].toFixed(2)}mm`)
  }
  min={sliderMin}
  max={sliderMax}
  {step}
  onCommit={(v) =>
    onCommit?.(
      mode === "deadzone"
        ? [
            mmToDistance(v[0], keyIndex, calibration),
            mmToDistance(Math.max(0, travel - v[1]), keyIndex, calibration),
          ]
        : [
            mmToDistance(v[0], keyIndex, calibration),
            mmToDistance(v[1], keyIndex, calibration),
          ],
    )}
  {...props}
/>
