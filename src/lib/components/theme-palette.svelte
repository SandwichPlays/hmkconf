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
  import { CheckIcon, RotateCcwIcon } from "@lucide/svelte"
  import {
    applyThemeColor,
    DEFAULT_ACCENT,
    PRESET_THEMES,
    themeState,
    getEffectiveAccentColor,
    hexToRgb,
  } from "$lib/theme.svelte"

  let hexInput = $state(
    themeState.accent === "default" ? "DEFAULT" : themeState.accent,
  )

  $effect(() => {
    hexInput = themeState.accent === "default" ? "DEFAULT" : themeState.accent
  })

  function handleSelectPreset(color: string) {
    hexInput = color === "default" ? "DEFAULT" : color
    applyThemeColor(color)
  }

  function handleCustomInput(val: string) {
    hexInput = val
    if (val.trim().toLowerCase() === "default") {
      applyThemeColor("default")
    } else if (hexToRgb(val)) {
      applyThemeColor(val)
    }
  }

  function handleReset() {
    handleSelectPreset(DEFAULT_ACCENT)
  }

  const effectiveColor = $derived(getEffectiveAccentColor(themeState.accent))
</script>

<div class="flex flex-col gap-3">
  <!-- Presets Grid -->
  <div class="grid grid-cols-3 sm:grid-cols-9 gap-2">
    {#each PRESET_THEMES as preset}
      {@const isSelected =
        themeState.accent.toLowerCase() === preset.color.toLowerCase()}
      {@const isDefault = preset.color === "default"}
      <button
        type="button"
        onclick={() => handleSelectPreset(preset.color)}
        title="{preset.name} {isDefault ? '(Auto Light/Dark)' : `(${preset.color})`}"
        class="group relative flex h-10 w-full items-center justify-center rounded-lg border border-border/80 shadow-2xs transition-all duration-150 hover:scale-105 active:scale-95"
        style={isDefault
          ? "background: linear-gradient(135deg, #ffffff 50%, #09090b 50%);"
          : `background-color: ${preset.color};`}
      >
        {#if isSelected}
          <div
            class="flex size-5 items-center justify-center rounded-full shadow-xs {isDefault
              ? 'border border-border bg-background text-foreground'
              : 'bg-black/60 text-white dark:bg-black/70'}"
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
        value={effectiveColor}
        oninput={(e) => handleCustomInput(e.currentTarget.value)}
        class="absolute -inset-2 size-12 cursor-pointer opacity-0"
        title="Pick custom color"
      />
      <div
        class="size-full"
        style={themeState.accent === "default"
          ? "background: linear-gradient(135deg, #ffffff 50%, #09090b 50%);"
          : `background-color: ${themeState.accent};`}
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
        class="w-full bg-transparent outline-none uppercase font-semibold text-foreground"
      />
    </div>

    <button
      type="button"
      onclick={handleReset}
      title="Reset to default (Auto Light/Dark)"
      class="flex h-8 items-center gap-1 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <RotateCcwIcon class="size-3" />
      <span class="hidden sm:inline">Reset</span>
    </button>
  </div>
</div>
