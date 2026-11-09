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
  import { KeyboardEditorKeyboard } from "$lib/components/keyboard-editor"
  import EncoderWidget from "$lib/components/keyboard-editor/encoder-widget.svelte"
  import * as KeyButton from "$lib/components/key-button"
  import * as KeycodeButton from "$lib/components/keycode-button"
  import { keyboardContext } from "$lib/keyboard"
  import { getKeycodeMetadata } from "$lib/keycodes"
  import {
    defaultRGBColor,
    HMK_RGBMode,
    rgbToHex,
    type HMK_RGBColor,
  } from "$lib/libhmk/rgb"
  import { cn } from "$lib/utils"
  import { rgbStateContext } from "../context.svelte"
  import { keymapQueryContext } from "../queries/keymap-query.svelte"
  import { rgbQueryContext } from "../queries/rgb-query.svelte"

  const keyboard = keyboardContext.get()
  const rgbState = rgbStateContext.get()
  const keymapQuery = keymapQueryContext.get()
  const rgbQuery = rgbQueryContext.get()

  const { leds, showKeymap } = $derived(rgbState)
  const { current: keymap } = $derived(keymapQuery.keymap)
  const { current: rgbOptions } = $derived(rgbQuery.rgbOptions)
  const { current: rgbColors } = $derived(rgbQuery.rgbColors)

  const numLeds = $derived(keyboard.metadata.rgb?.numLeds ?? 0)
  const keyMap = $derived(keyboard.metadata.rgb?.keyMap ?? [])

  function getLedsForKey(key: number): number[] {
    const matched: number[] = []
    for (let i = 0; i < keyMap.length; i++) {
      if (keyMap[i] === key) matched.push(i)
    }
    return matched
  }

  function isKeySelected(key: number): boolean {
    const mapped = getLedsForKey(key)
    return mapped.length > 0 && mapped.every((led) => leds.has(led))
  }

  function toggleKeyLeds(key: number) {
    const mapped = getLedsForKey(key)
    if (mapped.length === 0) return
    const allSelected = mapped.every((led) => leds.has(led))
    for (const led of mapped) {
      if (allSelected) rgbState.leds.delete(led)
      else rgbState.leds.add(led)
    }
  }

  function toggleLed(led: number) {
    if (leds.has(led)) rgbState.leds.delete(led)
    else rgbState.leds.add(led)
  }

  function getPreviewHex(ledIndex: number): string {
    if (!rgbOptions || rgbOptions.mode === HMK_RGBMode.OFF || rgbOptions.brightness === 0) {
      return "#18181b"
    }
    let color: HMK_RGBColor = defaultRGBColor
    if (rgbOptions.mode === HMK_RGBMode.PER_KEY) {
      color = rgbColors?.[ledIndex] ?? defaultRGBColor
    } else if (rgbOptions.mode === HMK_RGBMode.RAINBOW) {
      const hue = ((ledIndex * 360) / Math.max(1, numLeds)) % 360
      return `hsl(${hue}, 90%, 55%)`
    } else {
      color = rgbOptions.color1
    }
    return rgbToHex(color)
  }
</script>

<div class="flex flex-1 flex-col items-center justify-center gap-3 overflow-hidden">
  <KeyboardEditorKeyboard>
    {#snippet keyGenerator(key)}
      {@const mappedLeds = getLedsForKey(key)}
      {@const firstLed = mappedLeds[0]}
      {@const selected = isKeySelected(key)}
      {#if !keymap || !rgbOptions}
        <KeycodeButton.Skeleton />
      {:else if mappedLeds.length === 0}
        <KeyButton.Root disabled class="opacity-45 cursor-not-allowed">
          <span class="text-[10px] text-muted-foreground">NO LED</span>
        </KeyButton.Root>
      {:else}
        {@const previewColor = getPreviewHex(firstLed)}
        {@const meta = getKeycodeMetadata(keymap[0][key])}
        <KeyButton.Root
          data-state={selected ? "on" : "off"}
          onclick={() => toggleKeyLeds(key)}
          class="relative overflow-hidden"
        >
          <div
            class="pointer-events-none absolute inset-x-1.5 bottom-1.5 h-1.5 rounded-full transition-colors"
            style:background-color={previewColor}
            style:box-shadow={`0 0 8px ${previewColor}`}
          ></div>
          {#if showKeymap}
            <span class="truncate px-1 text-xs font-medium">{meta.name}</span>
          {:else}
            <span class="text-[11px] font-semibold">LED {firstLed + 1}</span>
            <span class="font-mono text-[9px] text-muted-foreground uppercase">
              {previewColor.startsWith("#") ? previewColor : "RAINBOW"}
            </span>
          {/if}
        </KeyButton.Root>
      {/if}
    {/snippet}
    {#snippet encoderGenerator(encoder)}
      <EncoderWidget
        {...encoder}
        interactive
        leftSelected={isKeySelected(encoder.keys[0])}
        rightSelected={isKeySelected(encoder.keys[1])}
        buttonSelected={
          encoder.buttonKey !== undefined && isKeySelected(encoder.buttonKey)
        }
        ccwKeycode={keymap ? keymap[0][encoder.keys[0]] : undefined}
        cwKeycode={keymap ? keymap[0][encoder.keys[1]] : undefined}
        btnKeycode={
          keymap && encoder.buttonKey !== undefined
            ? keymap[0][encoder.buttonKey]
            : undefined
        }
        onclick={(k) => toggleKeyLeds(k)}
      />
    {/snippet}
  </KeyboardEditorKeyboard>

  {#if numLeds > 0}
    <div class="flex flex-wrap items-center justify-center gap-2 px-4 pb-2">
      {#each { length: numLeds } as _, i (i)}
        {@const selected = leds.has(i)}
        {@const previewColor = getPreviewHex(i)}
        {@const mappedKey = keyMap[i]}
        <button
          type="button"
          onclick={() => toggleLed(i)}
          class={cn(
            "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-all",
            selected
              ? "border-primary bg-primary/20 text-foreground ring-2 ring-primary/60"
              : "border-border bg-card/70 text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          <span
            class="size-3 rounded-full border border-white/20"
            style:background-color={previewColor}
            style:box-shadow={`0 0 6px ${previewColor}`}
          ></span>
          <span>LED {i + 1}</span>
          {#if mappedKey !== null && mappedKey !== undefined}
            <span class="text-[10px] opacity-70">(K{mappedKey + 1})</span>
          {:else}
            <span class="text-[10px] opacity-70">(Strip)</span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

