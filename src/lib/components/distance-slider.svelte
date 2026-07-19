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
    displayUnitDistance,
    distanceToUnit,
    SWITCH_DISTANCE_UNIT,
    unitToDistance,
  } from "$lib/distance"
  import type { HMK_Calibration } from "$lib/libhmk"
  import { optMap } from "$lib/utils"
  import type { ComponentProps } from "svelte"
  import CommitSlider from "./commit-slider.svelte"

  let {
    committed = $bindable(),
    min = 1,
    max = SWITCH_DISTANCE_UNIT,
    onCommit,
    keyIndex,
    calibration,
    ...props
  }: ComponentProps<typeof CommitSlider> & {
    keyIndex?: number
    calibration?: HMK_Calibration
  } = $props()
</script>

<CommitSlider
  bind:committed={
    () => optMap(committed, distanceToUnit),
    (v) => (committed = optMap(v, unitToDistance))
  }
  display={(v) => `${displayUnitDistance(v, keyIndex, calibration)}mm`}
  {min}
  {max}
  onCommit={(v) => onCommit?.(unitToDistance(v))}
  {...props}
/>
