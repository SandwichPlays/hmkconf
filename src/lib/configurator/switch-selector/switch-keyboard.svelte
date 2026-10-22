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
  import AreaSelect from "$lib/components/area-select.svelte"
  import { KeyboardEditorKeyboard } from "$lib/components/keyboard-editor"
  import * as KeycodeButton from "$lib/components/keycode-button"
  import { ToggleGroup } from "bits-ui"
  import { switchStateContext } from "../context.svelte"
  import { calibrationQueryContext } from "../queries/calibration.query.svelte"
  import { keymapQueryContext } from "../queries/keymap-query.svelte"
  import { getKeycodeMetadata } from "$lib/keycodes"
  import SwitchKeyButton from "./switch-key-button.svelte"

  const switchState = switchStateContext.get()
  const keymapQuery = keymapQueryContext.get()
  const calibrationQuery = calibrationQueryContext.get()

  const { keys } = $derived(switchState)
  const { current: keymap } = $derived(keymapQuery.keymap)
  const { current: calibration } = $derived(calibrationQuery.calibration)

  let isDragging = $state(false)
</script>

<svelte:document onmouseup={() => (isDragging = false)} />

<ToggleGroup.Root
  bind:value={() => [...keys].map(String), () => {}}
  type="multiple"
>
  {#snippet child({ props })}
    <AreaSelect
      bind:selections={
        () => switchState.keys, (v) => (switchState.keys = v)
      }
      class="flex flex-1 flex-col"
      {...props}
    >
      <KeyboardEditorKeyboard {...props}>
        {#snippet keyGenerator(key)}
          {#if !keymap}
            <KeycodeButton.Skeleton />
          {:else}
            <ToggleGroup.Item
              data-selectable
              data-selectable-index={key}
              onmousedown={(e) => {
                e.stopPropagation()
                isDragging = true
                if (keys.has(key)) switchState.keys.delete(key)
                else switchState.keys.add(key)
              }}
              onmouseenter={(e) => {
                e.stopPropagation()
                if (isDragging) switchState.keys.add(key)
              }}
              value={String(key)}
            >
              {#snippet child({ props })}
                <SwitchKeyButton
                  keyIndex={key}
                  calibration={calibration}
                  label={getKeycodeMetadata(keymap[0]?.[key] ?? 0).name}
                  {...props}
                />
              {/snippet}
            </ToggleGroup.Item>
          {/if}
        {/snippet}
      </KeyboardEditorKeyboard>
    </AreaSelect>
  {/snippet}
</ToggleGroup.Root>
