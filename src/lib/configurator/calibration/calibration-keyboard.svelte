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
  import * as KeyButton from "$lib/components/key-button"
  import { KeyboardEditorKeyboard } from "$lib/components/keyboard-editor"
  import { displayDistance } from "$lib/distance"
  import { analogInfoQueryContext } from "../queries/analog-info-query.svelte"
  import { calibrationQueryContext } from "../queries/calibration.query.svelte"

  const analogInfoQuery = analogInfoQueryContext.get()
  const calibrationQuery = calibrationQueryContext.get()

  const { current: analogInfo } = $derived(analogInfoQuery.analogInfo)
  const { current: calibration } = $derived(calibrationQuery.calibration)
</script>

<KeyboardEditorKeyboard>
  {#snippet keyGenerator(key)}
    {#if !analogInfo}
      <KeyButton.Skeleton />
    {:else}
      {@const status = analogInfo[key]?.status ?? 0}
      {@const statusClass =
        status === 1
          ? "border-amber-400 bg-amber-500/20 text-amber-300 ring-2 ring-amber-400/50 animate-pulse"
          : status === 2
            ? "border-blue-400 bg-blue-500/40 text-blue-200 ring-2 ring-blue-400"
            : status === 3
              ? "border-emerald-400 bg-emerald-500/30 text-emerald-300 ring-1 ring-emerald-400"
              : ""}
      <KeyButton.Root class={statusClass}>
        <span>{analogInfo[key].adcValue}</span>
        <span>{displayDistance(analogInfo[key].distance, key, calibration)}</span>
      </KeyButton.Root>
    {/if}
  {/snippet}
</KeyboardEditorKeyboard>
