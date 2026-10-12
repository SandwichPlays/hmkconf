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
  import { CheckIcon, PaletteIcon, RotateCcwIcon } from "@lucide/svelte"
  import { buttonVariants } from "./ui/button"
  import * as Popover from "./ui/popover"
  import {
    applyThemeColor,
    DEFAULT_ACCENT,
    PRESET_THEMES,
    themeState,
    hexToRgb,
  } from "$lib/theme.svelte"

  let hexInput = $state(themeState.accent)

  $effect(() => {
    hexInput = themeState.accent
  })

  function handleSelectPreset(color: string) {
    hexInput = color
    applyThemeColor(color)
  }

  function handleCustomInput(val: string) {
    hexInput = val
    if (hexToRgb(val)) {
      applyThemeColor(val)
    }
  }

  function handleReset() {
    handleSelectPreset(DEFAULT_ACCENT)
  }

  const activePreset = $derived(
    PRESET_THEMES.find(
      (p) => p.color.toLowerCase() === themeState.accent.toLowerCase(),
    ),
  )
</script>

<Popover.Root>
  <Popover.Trigger
    class={buttonVariants({ variant: "outline", size: "icon" }) +
      " relative transition-colors"}
    title="Choose accent color"
  >
    <PaletteIcon class="size-[1.2rem]" />
    <span
      class="absolute bottom-1 right-1 size-2 rounded-full ring-1 ring-background shadow-xs transition-colors"
      style="background-color: {themeState.accent};"
    ></span>
    <span class="sr-only">Choose accent color</span>
  </Popover.Trigger>

  <Popover.Content align="end" class="w-72 flex flex-col gap-3 p-3.5 shadow-xl">
    <div class="flex items-center justify-between">
      <div class="flex flex-col">
        <span class="text-sm font-semibold tracking-tight">Theme Accent</span>
        <span class="text-xs text-muted-foreground">
          {activePreset ? activePreset.name : "Custom Accent"}
        </span>
      </div>
      <button
        type="button"
        onclick={handleReset}
        title="Reset to default (Sakura #febed5)"
        class="flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <RotateCcwIcon class="size-3" />
        Reset
      </button>
    </div>

    <!-- Preset Swatches Grid -->
    <div class="grid grid-cols-4 gap-2 pt-1">
      {#each PRESET_THEMES as preset}
        {@const isSelected =
          themeState.accent.toLowerCase() === preset.color.toLowerCase()}
        <button
          type="button"
          onclick={() => handleSelectPreset(preset.color)}
          title="{preset.name} ({preset.color})"
          class="group relative flex h-10 w-full items-center justify-center rounded-lg border border-black/10 transition-all duration-150 hover:scale-105 active:scale-95 dark:border-white/10"
          style="background-color: {preset.color};"
        >
          {#if isSelected}
            <div
              class="flex size-5 items-center justify-center rounded-full bg-black/60 text-white shadow-xs dark:bg-black/70"
            >
              <CheckIcon class="size-3.5 stroke-[3]" />
            </div>
          {/if}
        </button>
      {/each}
    </div>

    <!-- Custom Hex & Picker Row -->
    <div class="flex items-center gap-2 pt-1 border-t border-border/60">
      <div
        class="relative flex size-8 shrink-0 overflow-hidden rounded-md border border-input shadow-xs"
      >
        <input
          type="color"
          value={themeState.accent}
          oninput={(e) => handleCustomInput(e.currentTarget.value)}
          class="absolute -inset-2 size-12 cursor-pointer opacity-0"
          title="Pick custom color"
        />
        <div
          class="size-full"
          style="background-color: {themeState.accent};"
        ></div>
      </div>
      <div class="flex flex-1 items-center rounded-md border border-input bg-background px-2.5 py-1 text-xs font-mono shadow-xs">
        <span class="select-none text-muted-foreground mr-1">HEX</span>
        <input
          type="text"
          value={hexInput}
          maxlength={7}
          oninput={(e) => handleCustomInput(e.currentTarget.value)}
          placeholder="#febed5"
          class="w-full bg-transparent outline-none uppercase font-semibold"
        />
      </div>
    </div>

    <!-- Live Preview Pill -->
    <div
      class="flex items-center justify-between rounded-md border border-primary/50 bg-primary/20 px-2.5 py-1.5 text-xs text-accent-foreground shadow-xs transition-colors"
    >
      <span class="font-medium">Selected Style Preview</span>
      <span class="font-mono font-bold uppercase">{themeState.accent}</span>
    </div>
  </Popover.Content>
</Popover.Root>
