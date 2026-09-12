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
  import { optMap } from "$lib/utils"
  import type { ComponentProps } from "svelte"
  import VerticalCommitSlider from "./vertical-commit-slider.svelte"

  let {
    committed = $bindable(),
    min,
    max,
    step = 0.01,
    onCommit,
    keyIndex,
    calibration,
    ...props
  }: ComponentProps<typeof VerticalCommitSlider> & {
    keyIndex?: number
    calibration?: HMK_Calibration
  } = $props()

  const travel = $derived(getSwitchDistanceMM(keyIndex, calibration))
  const sliderMin = $derived(min ?? 0)
  const sliderMax = $derived(max ?? travel)
</script>

<VerticalCommitSlider
  bind:committed={
    () => optMap(committed, (v) => distanceToMM(v, keyIndex, calibration)),
    (v) => (committed = optMap(v, (m) => mmToDistance(m, keyIndex, calibration)))
  }
  display={(v) => `${v.toFixed(2)}mm`}
  min={sliderMin}
  max={sliderMax}
  {step}
  onCommit={(v) => onCommit?.(mmToDistance(v, keyIndex, calibration))}
  {...props}
/>
