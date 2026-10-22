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
  import * as KeyboardEditor from "$lib/components/keyboard-editor"
  import SwitchGraphic from "$lib/components/switch-graphic.svelte"
  import { Button } from "$lib/components/ui/button"
  import { keyboardContext } from "$lib/keyboard"
  import { cn, type WithoutChildren } from "$lib/utils"
  import type { ComponentProps } from "svelte"
  import { displayLayoutContext, persistedStateContext, switchStateContext } from "../context.svelte"
  import { calibrationQueryContext } from "../queries/calibration.query.svelte"
  import {
    resolveSwitch,
    SUPPORTED_SWITCHES,
    type SupportedSwitch,
  } from "./switch-definitions"
  import SwitchKeyboard from "./switch-keyboard.svelte"

  const {
    ...props
  }: WithoutChildren<ComponentProps<typeof KeyboardEditor.Root>> = $props()

  const keyboard = keyboardContext.get()
  const numKeys = keyboard.metadata.numKeys

  const switchState = switchStateContext.get()
  const { keys } = $derived(switchState)
  const allKeys = $derived(
    displayLayoutContext.get().displayKeys.map(({ key }) => key),
  )

  const calibrationQuery = calibrationQueryContext.get()
  const { current: calibration } = $derived(calibrationQuery.calibration)

  const persistedState = persistedStateContext.get()

  const selectedFirstKey = $derived([...keys][0])

  const currentSwitch = $derived.by(() => {
    if (selectedFirstKey === undefined || !calibration?.switchTravel) {
      return null
    }
    const deciMM = calibration.switchTravel[selectedFirstKey] ?? 36
    const storedType = persistedState?.current?.switchTypes?.[String(selectedFirstKey)]
    return resolveSwitch(deciMM, storedType)
  })

  const currentSwitchId = $derived(currentSwitch?.id ?? "yingying-dual-lights-max")

  function selectAll() {
    allKeys.forEach((key) => switchState.keys.add(key))
  }

  function discardSelection() {
    switchState.keys.clear()
  }

  function assignSwitch(targetSwitch: SupportedSwitch) {
    if (keys.size === 0 || !calibration?.switchTravel) return

    // Persist switch choice per key
    const currentTypes = { ...(persistedState.current.switchTypes ?? {}) }
    for (const key of keys) {
      currentTypes[String(key)] = targetSwitch.id
    }
    persistedState.current.switchTypes = currentTypes

    // If predefined switch with fixed travel, update hardware calibration
    if (targetSwitch.baseTravelMM > 0) {
      const newSwitchTravel = [...calibration.switchTravel]
      const targetTravelDeciMM = Math.round(targetSwitch.baseTravelMM * 10)

      for (const key of keys) {
        newSwitchTravel[key] = targetTravelDeciMM
      }

      calibrationQuery.set({
        data: {
          ...calibration,
          switchTravel: newSwitchTravel,
        },
      })
    }
  }
</script>

<KeyboardEditor.Root {...props}>
  <!-- Keyboard Preview Pane with Switch Graphics -->
  <KeyboardEditor.Pane>
    <SwitchKeyboard />

    <KeyboardEditor.Menubar>
      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={allKeys.every((key) => keys.has(key))}
          onclick={selectAll}
        >
          Select all keys
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={keys.size === 0}
          onclick={discardSelection}
        >
          Discard selection
        </Button>
      </div>

    </KeyboardEditor.Menubar>
  </KeyboardEditor.Pane>

  <KeyboardEditor.Handle />

  <!-- Bottom Configuration Section -->
  <KeyboardEditor.Pane>
    <KeyboardEditor.Container class="p-6">
      <div class="flex flex-col gap-6 max-w-4xl mx-auto rounded-xl border p-6 bg-card/60 shadow-2xs">
        <div>
          <h3 class="font-bold text-2xl text-foreground">
            Assign Switches
          </h3>
          <p class="text-base text-muted-foreground mt-1.5">
            Select keys directly on the keyboard preview, then assign your installed switches by choosing from the list below.
          </p>
        </div>

        <!-- Switches Grid: Large square selections with graphic, full name, and travel distance -->
        <div class="flex flex-wrap gap-5 pt-1">
          {#each SUPPORTED_SWITCHES as sw (sw.id)}
            {@const isAssigned = currentSwitchId === sw.id && keys.size > 0}
            <button
              type="button"
              disabled={keys.size === 0}
              onclick={() => assignSwitch(sw)}
              class={cn(
                "flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all select-none w-44 h-44 aspect-square relative group",
                isAssigned
                  ? "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/60"
                  : "border-border/60 bg-card hover:border-primary/50 hover:bg-muted/30",
                keys.size === 0
                  ? "opacity-50 cursor-not-allowed hover:border-border/60 hover:bg-card"
                  : "cursor-pointer",
              )}
            >
              <!-- Switch Top-Down Visual Graphic -->
              <div class="flex items-center justify-center transition-transform group-hover:scale-105">
                <SwitchGraphic
                  mode="topdown"
                  size={52}
                  stemColor={sw.stemColor}
                  housingColor={sw.housingColor}
                />
              </div>

              <!-- Switch Name (fits comfortably without being cut off) -->
              <span class="font-semibold text-sm text-foreground text-center mt-3 px-1 leading-snug">
                {sw.name}
              </span>

              <!-- Travel distance -->
              <span class="text-xs text-muted-foreground mt-1">
                {sw.baseTravelMM > 0 ? `${sw.baseTravelMM.toFixed(1)}mm` : "Custom"}
              </span>
            </button>
          {/each}
        </div>
      </div>
    </KeyboardEditor.Container>
  </KeyboardEditor.Pane>
</KeyboardEditor.Root>
