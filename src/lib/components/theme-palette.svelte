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
  } from "$lib/theme.svelte"

  function handleSelectPreset(color: string) {
    applyThemeColor(color)
  }

  function handleReset() {
    applyThemeColor(DEFAULT_ACCENT)
  }

  const activePreset = $derived(
    PRESET_THEMES.find(
      (p) => p.color.toLowerCase() === themeState.accent.toLowerCase(),
    ) ?? PRESET_THEMES[0],
  )
</script>

<div class="flex flex-col gap-3">
  <!-- Presets Grid -->
  <div class="grid grid-cols-3 sm:grid-cols-9 gap-2">
    {#each PRESET_THEMES as preset}
      {@const isSelected =
        themeState.accent.toLowerCase() === preset.color.toLowerCase()}
      <button
        type="button"
        onclick={() => handleSelectPreset(preset.color)}
        title="{preset.name} ({preset.color})"
        class="group relative flex h-10 w-full items-center justify-center rounded-lg border border-border/80 shadow-2xs transition-all duration-150 hover:scale-105 active:scale-95"
        style="background-color: {preset.color};"
      >
        {#if isSelected}
          <div
            class="flex size-5 items-center justify-center rounded-full bg-black/75 text-white shadow-xs"
          >
            <CheckIcon class="size-3.5 stroke-[3]" />
          </div>
        {/if}
      </button>
    {/each}
  </div>

  <div class="flex items-center justify-between pt-1 border-t border-border/60">
    <div class="flex items-center gap-2 text-xs">
      <span class="text-muted-foreground">Active Preset:</span>
      <span class="font-semibold text-foreground">{activePreset.name}</span>
      <span class="font-mono text-muted-foreground uppercase">({themeState.accent})</span>
    </div>

    <button
      type="button"
      onclick={handleReset}
      title="Reset to default (White)"
      class="flex h-8 items-center gap-1 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <RotateCcwIcon class="size-3" />
      <span>Reset to White</span>
    </button>
  </div>
</div>
