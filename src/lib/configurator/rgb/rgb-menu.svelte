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
  import CommitSlider from "$lib/components/commit-slider.svelte"
  import { Button } from "$lib/components/ui/button"
  import { keyboardContext } from "$lib/keyboard"
  import {
    defaultRGBColor,
    defaultRGBOptions,
    hexToRgb,
    HMK_RGBDirection,
    HMK_RGBMode,
    rgbToHex,
    type HMK_RGBColor,
    type HMK_RGBOptions,
  } from "$lib/libhmk/rgb"
  import { cn, setToIntervals } from "$lib/utils"
  import {
    ActivityIcon,
    ArrowDownIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
    ArrowUpIcon,
    CircleDotIcon,
    FlameIcon,
    Grid2X2Icon,
    PowerOffIcon,
    RainbowIcon,
    SparklesIcon,
    SunIcon,
    WavesIcon,
  } from "@lucide/svelte"
  import { rgbStateContext } from "../context.svelte"
  import { rgbQueryContext } from "../queries/rgb-query.svelte"

  const keyboard = keyboardContext.get()
  const rgbState = rgbStateContext.get()
  const rgbQuery = rgbQueryContext.get()

  const { leds } = $derived(rgbState)
  const { current: rgbOptions } = $derived(rgbQuery.rgbOptions)
  const { current: rgbColors } = $derived(rgbQuery.rgbColors)

  const numLeds = $derived(keyboard.metadata.rgb?.numLeds ?? 0)

  const modes = [
    {
      mode: HMK_RGBMode.OFF,
      label: "Off",
      description: "Disable all LEDs",
      icon: PowerOffIcon,
    },
    {
      mode: HMK_RGBMode.SOLID,
      label: "Solid",
      description: "Static single color across all LEDs",
      icon: SunIcon,
    },
    {
      mode: HMK_RGBMode.PER_KEY,
      label: "Per-Key",
      description: "Custom static color for each individual LED",
      icon: Grid2X2Icon,
    },
    {
      mode: HMK_RGBMode.BREATHING,
      label: "Breathing",
      description: "Smoothly pulse between Primary and Secondary color",
      icon: SparklesIcon,
    },
    {
      mode: HMK_RGBMode.RAINBOW,
      label: "Rainbow",
      description: "Continuous full-spectrum rainbow cycle",
      icon: RainbowIcon,
    },
    {
      mode: HMK_RGBMode.WAVE,
      label: "Gradient Wave",
      description: "Directional wave between Primary and Secondary color",
      icon: WavesIcon,
    },
    {
      mode: HMK_RGBMode.REACTIVE,
      label: "Reactive",
      description: "Flash Primary on keypress and fade to Secondary",
      icon: FlameIcon,
    },
    {
      mode: HMK_RGBMode.ANALOG_DEPTH,
      label: "Analog Depth",
      description: "Blend Primary → Secondary in real time by switch travel",
      icon: ActivityIcon,
    },
  ] as const

  const directions = [
    {
      value: HMK_RGBDirection.LEFT_TO_RIGHT,
      label: "Left → Right",
      icon: ArrowRightIcon,
    },
    {
      value: HMK_RGBDirection.RIGHT_TO_LEFT,
      label: "Right → Left",
      icon: ArrowLeftIcon,
    },
    {
      value: HMK_RGBDirection.TOP_TO_BOTTOM,
      label: "Top → Bottom",
      icon: ArrowDownIcon,
    },
    {
      value: HMK_RGBDirection.BOTTOM_TO_TOP,
      label: "Bottom → Top",
      icon: ArrowUpIcon,
    },
    {
      value: HMK_RGBDirection.CENTER_OUT,
      label: "Center Out",
      icon: CircleDotIcon,
    },
  ] as const

  const colorPresets = [
    { name: "Cyan", hex: "#00c8ff" },
    { name: "Purple", hex: "#9333ea" },
    { name: "Crimson", hex: "#ef4444" },
    { name: "Emerald", hex: "#10b981" },
    { name: "Amber", hex: "#f59e0b" },
    { name: "Magenta", hex: "#ec4899" },
    { name: "Royal Blue", hex: "#3b82f6" },
    { name: "Pure White", hex: "#ffffff" },
    { name: "Off / Black", hex: "#000000" },
  ]

  const currentOptions = $derived(rgbOptions ?? defaultRGBOptions)
  const currentMode = $derived(currentOptions.mode)

  const speedSupported = $derived(
    currentMode === HMK_RGBMode.BREATHING ||
      currentMode === HMK_RGBMode.RAINBOW ||
      currentMode === HMK_RGBMode.WAVE ||
      currentMode === HMK_RGBMode.REACTIVE,
  )

  const secondaryColorSupported = $derived(
    currentMode === HMK_RGBMode.BREATHING ||
      currentMode === HMK_RGBMode.WAVE ||
      currentMode === HMK_RGBMode.REACTIVE ||
      currentMode === HMK_RGBMode.ANALOG_DEPTH,
  )

  function updateOptions(patch: Partial<HMK_RGBOptions>) {
    if (!rgbOptions) return
    rgbQuery.setOptions({
      data: {
        ...rgbOptions,
        ...patch,
      },
    })
  }

  const selectedPerKeyColor = $derived.by(() => {
    if (!rgbColors || leds.size === 0) return defaultRGBColor
    const [first] = leds
    return rgbColors[first] ?? defaultRGBColor
  })

  function updateSelectedLedsColor(color: HMK_RGBColor) {
    if (!rgbColors || leds.size === 0) return
    const updates = setToIntervals(leds).map(([offset, len]) => ({
      offset,
      data: Array.from({ length: len }, () => ({ ...color })),
    }))
    rgbQuery.setManyColors(updates)
  }

  function applyColorToAllLeds(color: HMK_RGBColor) {
    if (numLeds === 0) return
    rgbQuery.setColors({
      offset: 0,
      data: Array.from({ length: numLeds }, () => ({ ...color })),
    })
  }
</script>

<div class="size-full overflow-y-auto p-4">
  <div class="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
    <!-- Column 1: Effect Mode & Direction -->
    <div class="flex h-full flex-col gap-4 rounded-xl border bg-card/60 p-5 shadow-2xs">
      <h3 class="border-b pb-2 text-lg font-semibold">Lighting Effect</h3>
      <div class="grid grid-cols-2 gap-2.5">
        {#each modes as { mode, label, description, icon: Icon } (mode)}
          {@const active = currentMode === mode}
          <button
            type="button"
            onclick={() => updateOptions({ mode })}
            class={cn(
              "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all",
              active
                ? "border-primary bg-primary/15 text-foreground ring-1 ring-primary/50"
                : "border-border bg-background/60 text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <div class="flex items-center gap-2 font-medium text-foreground">
              <Icon class={cn("size-4", active && "text-primary")} />
              <span class="text-sm">{label}</span>
            </div>
            <span class="line-clamp-2 text-[11px] leading-tight text-muted-foreground">
              {description}
            </span>
          </button>
        {/each}
      </div>

      {#if currentMode === HMK_RGBMode.WAVE}
        <div class="mt-2 flex flex-col gap-2 border-t pt-3">
          <span class="text-sm font-medium">Wave Direction</span>
          <div class="grid grid-cols-2 gap-2">
            {#each directions as { value, label, icon: DirIcon } (value)}
              {@const active = currentOptions.direction === value}
              <Button
                size="sm"
                variant={active ? "default" : "outline"}
                class="justify-start gap-2 text-xs"
                onclick={() => updateOptions({ direction: value })}
              >
                <DirIcon class="size-3.5" />
                <span>{label}</span>
              </Button>
            {/each}
          </div>
        </div>
      {/if}
    </div>

    <!-- Column 2: Brightness & Animation Speed -->
    <div class="flex h-full flex-col gap-5 rounded-xl border bg-card/60 p-5 shadow-2xs">
      <h3 class="border-b pb-2 text-lg font-semibold">Brightness & Speed</h3>

      <CommitSlider
        bind:committed={
          () => Math.round((currentOptions.brightness / 255) * 100),
          (v) => updateOptions({ brightness: Math.round((v / 100) * 255) })
        }
        min={0}
        max={100}
        step={1}
        disabled={!rgbOptions}
        title="Brightness (%)"
        description="Global LED brightness (automatically current-limited)."
      />

      <CommitSlider
        bind:committed={
          () => Math.round((currentOptions.speed / 255) * 100),
          (v) => updateOptions({ speed: Math.round((v / 100) * 255) })
        }
        min={0}
        max={100}
        step={1}
        disabled={!rgbOptions || !speedSupported}
        title="Animation Speed (%)"
        description={
          speedSupported
            ? "Controls cycle or fade rate of the active effect."
            : "Speed only applies to animated effects."
        }
      />

      <div class="mt-auto rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
        <div class="flex items-center justify-between font-medium text-foreground">
          <span>Hardware LEDs</span>
          <span>{numLeds} Addressable LEDs</span>
        </div>
        <p class="mt-1 leading-relaxed">
          Settings are saved per profile. You can also bind RGB Toggle, Mode, Brightness, and Speed keys in the Remap tab under Special keys.
        </p>
      </div>
    </div>

    <!-- Column 3: Color Configuration -->
    <div class="flex h-full flex-col gap-4 rounded-xl border bg-card/60 p-5 shadow-2xs">
      <h3 class="border-b pb-2 text-lg font-semibold">Colors</h3>

      {#if currentMode === HMK_RGBMode.OFF || currentMode === HMK_RGBMode.RAINBOW}
        <div class="flex flex-1 flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground">
          <p>
            {currentMode === HMK_RGBMode.OFF
              ? "RGB lighting is currently turned off. Select an effect mode to configure colors."
              : "Rainbow mode automatically cycles through the full color spectrum."}
          </p>
        </div>
      {:else if currentMode === HMK_RGBMode.PER_KEY}
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <div class="flex flex-col">
              <span class="text-sm font-medium">Selected LED Color</span>
              <span class="text-xs text-muted-foreground">
                {leds.size > 0
                  ? `Editing ${leds.size} selected LED${leds.size > 1 ? "s" : ""}`
                  : "Select keys or LED pills above to edit"}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <input
                type="color"
                disabled={leds.size === 0}
                value={rgbToHex(selectedPerKeyColor)}
                oninput={(e) =>
                  updateSelectedLedsColor(
                    hexToRgb((e.currentTarget as HTMLInputElement).value),
                  )}
                class="h-9 w-12 cursor-pointer rounded border bg-transparent p-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <span class="font-mono text-xs uppercase">
                {rgbToHex(selectedPerKeyColor)}
              </span>
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <span class="text-xs font-medium text-muted-foreground">Quick Swatches</span>
            <div class="flex flex-wrap gap-2">
              {#each colorPresets as preset (preset.name)}
                <button
                  type="button"
                  disabled={leds.size === 0}
                  title={preset.name}
                  onclick={() => updateSelectedLedsColor(hexToRgb(preset.hex))}
                  class="size-7 rounded-full border border-white/20 transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-40"
                  style:background-color={preset.hex}
                ></button>
              {/each}
            </div>
          </div>

          <div class="border-t pt-3">
            <Button
              size="sm"
              variant="outline"
              class="w-full"
              onclick={() => applyColorToAllLeds(selectedPerKeyColor)}
            >
              Apply Current Color to All {numLeds} LEDs
            </Button>
          </div>
        </div>
      {:else}
        <div class="flex flex-col gap-5">
          <!-- Primary Color -->
          <div class="flex items-center justify-between">
            <div class="flex flex-col">
              <span class="text-sm font-medium">
                {currentMode === HMK_RGBMode.ANALOG_DEPTH
                  ? "Rest Color (Primary)"
                  : currentMode === HMK_RGBMode.REACTIVE
                    ? "Hit Color (Primary)"
                    : "Primary Color"}
              </span>
              <span class="text-xs text-muted-foreground">
                {currentMode === HMK_RGBMode.ANALOG_DEPTH
                  ? "Color when key is released"
                  : currentMode === HMK_RGBMode.REACTIVE
                    ? "Flash color when key is pressed"
                    : "Main effect color"}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <input
                type="color"
                value={rgbToHex(currentOptions.color1)}
                oninput={(e) =>
                  updateOptions({
                    color1: hexToRgb(
                      (e.currentTarget as HTMLInputElement).value,
                    ),
                  })}
                class="h-9 w-12 cursor-pointer rounded border bg-transparent p-0.5"
              />
              <span class="font-mono text-xs uppercase">
                {rgbToHex(currentOptions.color1)}
              </span>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            {#each colorPresets as preset (preset.name)}
              <button
                type="button"
                title={`Primary: ${preset.name}`}
                onclick={() =>
                  updateOptions({ color1: hexToRgb(preset.hex) })}
                class="size-6 rounded-full border border-white/20 transition-transform hover:scale-110"
                style:background-color={preset.hex}
              ></button>
            {/each}
          </div>

          <!-- Secondary Color -->
          {#if secondaryColorSupported}
            <div class="flex flex-col gap-3 border-t pt-4">
              <div class="flex items-center justify-between">
                <div class="flex flex-col">
                  <span class="text-sm font-medium">
                    {currentMode === HMK_RGBMode.ANALOG_DEPTH
                      ? "Bottom-Out Color (Secondary)"
                      : currentMode === HMK_RGBMode.REACTIVE
                        ? "Background Color (Secondary)"
                        : "Secondary Color"}
                  </span>
                  <span class="text-xs text-muted-foreground">
                    {currentMode === HMK_RGBMode.ANALOG_DEPTH
                      ? "Color when switch is fully pressed"
                      : currentMode === HMK_RGBMode.REACTIVE
                        ? "Ambient color when idle"
                        : "Second color for gradient/pulse"}
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <input
                    type="color"
                    value={rgbToHex(currentOptions.color2)}
                    oninput={(e) =>
                      updateOptions({
                        color2: hexToRgb(
                          (e.currentTarget as HTMLInputElement).value,
                        ),
                      })}
                    class="h-9 w-12 cursor-pointer rounded border bg-transparent p-0.5"
                  />
                  <span class="font-mono text-xs uppercase">
                    {rgbToHex(currentOptions.color2)}
                  </span>
                </div>
              </div>

              <div class="flex flex-wrap gap-2">
                {#each colorPresets as preset (preset.name)}
                  <button
                    type="button"
                    title={`Secondary: ${preset.name}`}
                    onclick={() =>
                      updateOptions({ color2: hexToRgb(preset.hex) })}
                    class="size-6 rounded-full border border-white/20 transition-transform hover:scale-110"
                    style:background-color={preset.hex}
                  ></button>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>

