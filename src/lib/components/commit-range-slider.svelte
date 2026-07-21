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
  import { cn, type WithoutChildren } from "$lib/utils"
  import type { HTMLAttributes } from "svelte/elements"

  let {
    class: className,
    disabled,
    title,
    description,
    min = 0,
    max = 4.0,
    step = 0.01,
    committed = $bindable([0, 4.0]),
    display,
    mode = "sensitivity",
    onCommit,
    ...props
  }: WithoutChildren<HTMLAttributes<HTMLDivElement>> & {
    disabled?: boolean
    title: string
    description?: string
    min?: number
    max?: number
    step?: number
    committed?: [number, number]
    display?: (v: [number, number]) => string
    mode?: "sensitivity" | "deadzone"
    onCommit?: (v: [number, number]) => void
  } = $props()

  let value = $state<[number, number]>([0, 4.0])
  let trackRef = $state<HTMLDivElement | null>(null)
  let activeThumb = $state<0 | 1 | null>(null)

  $effect(() => {
    if (committed !== undefined) {
      value = [committed[0], committed[1]]
    }
  })

  const range = $derived(max > min ? max - min : 1)

  const leftPct = $derived(
    mode === "deadzone"
      ? Math.max(0, Math.min(100, ((value[0] - min) / range) * 100))
      : Math.max(0, Math.min(100, ((value[0] - min) / range) * 100))
  )
  const rightPct = $derived(
    mode === "deadzone"
      ? Math.max(0, Math.min(100, (((max - value[1]) - min) / range) * 100))
      : Math.max(0, Math.min(100, ((value[1] - min) / range) * 100))
  )
  const widthPct = $derived(
    mode === "deadzone"
      ? Math.max(0, rightPct - leftPct)
      : Math.max(0, rightPct - leftPct)
  )

  function getSteppedValue(raw: number): number {
    const clamped = Math.max(min, Math.min(raw, max))
    const steps = Math.round((clamped - min) / step)
    return Number((min + steps * step).toFixed(4))
  }

  function handlePointerDown(thumbIndex: 0 | 1, e: PointerEvent) {
    if (disabled) return
    e.preventDefault()
    e.stopPropagation()
    activeThumb = thumbIndex
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function handlePointerMove(thumbIndex: 0 | 1, e: PointerEvent) {
    if (activeThumb !== thumbIndex || !trackRef || disabled) return
    const rect = trackRef.getBoundingClientRect()
    if (rect.width <= 0) return
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const rawVal = min + pct * range
    const stepped = getSteppedValue(rawVal)

    if (mode === "deadzone") {
      if (thumbIndex === 0) {
        const nextV0 = Math.min(stepped, max - value[1])
        if (nextV0 !== value[0]) value = [nextV0, value[1]]
      } else {
        const nextV1 = Math.min(max - stepped, max - value[0])
        if (nextV1 !== value[1]) value = [value[0], nextV1]
      }
    } else {
      if (thumbIndex === 0) {
        const nextV0 = Math.min(stepped, value[1])
        if (nextV0 !== value[0]) value = [nextV0, value[1]]
      } else {
        const nextV1 = Math.max(stepped, value[0])
        if (nextV1 !== value[1]) value = [value[0], nextV1]
      }
    }
  }

  function handlePointerUp(thumbIndex: 0 | 1, e: PointerEvent) {
    if (activeThumb === thumbIndex) {
      activeThumb = null
      committed = [value[0], value[1]]
      onCommit?.([value[0], value[1]])
    }
  }

  function handleTrackPointerDown(e: PointerEvent) {
    if (disabled || !trackRef || activeThumb !== null) return
    const rect = trackRef.getBoundingClientRect()
    if (rect.width <= 0) return
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const clickedVal = getSteppedValue(min + pct * range)

    if (mode === "deadzone") {
      const distTo0 = Math.abs(clickedVal - value[0])
      const distTo1 = Math.abs((max - clickedVal) - value[1])
      if (distTo0 <= distTo1) {
        const nextV0 = Math.min(clickedVal, max - value[1])
        value = [nextV0, value[1]]
      } else {
        const nextV1 = Math.min(max - clickedVal, max - value[0])
        value = [value[0], nextV1]
      }
    } else {
      const distTo0 = Math.abs(clickedVal - value[0])
      const distTo1 = Math.abs(clickedVal - value[1])
      if (distTo0 <= distTo1) {
        const nextV0 = Math.min(clickedVal, value[1])
        value = [nextV0, value[1]]
      } else {
        const nextV1 = Math.max(clickedVal, value[0])
        value = [value[0], nextV1]
      }
    }
    committed = [value[0], value[1]]
    onCommit?.([value[0], value[1]])
  }
</script>

<div class={cn("flex flex-col", className)} {...props}>
  <div class={cn("flex items-center justify-between text-sm gap-2", disabled && "opacity-50")}>
    <div class="flex flex-col text-wrap">
      <span class="font-medium">{title}</span>
      {#if description}
        <span class="text-xs text-muted-foreground">{description}</span>
      {/if}
    </div>
    <div class="flex items-center gap-2 shrink-0 text-xs font-medium">
      <div class="flex items-center gap-1 bg-muted/40 border rounded-md px-1.5 py-0.5">
        <span class="text-muted-foreground font-semibold">{mode === "deadzone" ? "Top:" : "Press:"}</span>
        <input
          type="number"
          step={step}
          min={min}
          max={mode === "deadzone" ? Number((max - value[1]).toFixed(4)) : value[1]}
          {disabled}
          value={value[0]}
          onchange={(e) => {
            const num = parseFloat((e.currentTarget as HTMLInputElement).value)
            if (!isNaN(num)) {
              const maxCap = mode === "deadzone" ? max - value[1] : value[1]
              const clamped = Math.max(min, Math.min(num, maxCap))
              value = [Number(clamped.toFixed(4)), value[1]]
              committed = [value[0], value[1]]
              onCommit?.([value[0], value[1]])
            }
          }}
          class="w-12 text-right bg-transparent text-xs font-semibold focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span class="text-muted-foreground">mm</span>
      </div>
      <div class="flex items-center gap-1 bg-muted/40 border rounded-md px-1.5 py-0.5">
        <span class="text-muted-foreground font-semibold">{mode === "deadzone" ? "Bottom:" : "Release:"}</span>
        <input
          type="number"
          step={step}
          min={min}
          max={mode === "deadzone" ? Number((max - value[0]).toFixed(4)) : max}
          {disabled}
          value={value[1]}
          onchange={(e) => {
            const num = parseFloat((e.currentTarget as HTMLInputElement).value)
            if (!isNaN(num)) {
              const maxCap = mode === "deadzone" ? max - value[0] : max
              const minCap = mode === "deadzone" ? min : value[0]
              const clamped = Math.max(minCap, Math.min(num, maxCap))
              value = [value[0], Number(clamped.toFixed(4))]
              committed = [value[0], value[1]]
              onCommit?.([value[0], value[1]])
            }
          }}
          class="w-12 text-right bg-transparent text-xs font-semibold focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span class="text-muted-foreground">mm</span>
      </div>
    </div>
  </div>
  <!-- Custom Dual Thumb Range Slider Track -->
  <div
    bind:this={trackRef}
    role="presentation"
    class={cn(
      "relative mt-3 flex h-4 w-full touch-none select-none items-center cursor-pointer",
      disabled && "opacity-50 pointer-events-none"
    )}
    onpointerdown={handleTrackPointerDown}
  >
    <div class="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        class="absolute h-full bg-primary"
        style="left: {leftPct}%; width: {widthPct}%;"
      ></div>
    </div>
    <!-- Left Stick Thumb (Press / Top Deadzone) -->
    <button
      type="button"
      tabindex="0"
      aria-label="Left Thumb"
      class={cn(
        "absolute w-2 h-4 shrink-0 rounded-l-xs border border-primary bg-white shadow-xs ring-ring/50 transition-[box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden -translate-x-full cursor-grab active:cursor-grabbing",
        activeThumb === 0 && "ring-4 z-10"
      )}
      style="left: {leftPct}%;"
      onpointerdown={(e) => handlePointerDown(0, e)}
      onpointermove={(e) => handlePointerMove(0, e)}
      onpointerup={(e) => handlePointerUp(0, e)}
      onpointercancel={(e) => handlePointerUp(0, e)}
    ></button>
    <!-- Right Stick Thumb (Release / Bottom Deadzone) -->
    <button
      type="button"
      tabindex="0"
      aria-label="Right Thumb"
      class={cn(
        "absolute w-2 h-4 shrink-0 rounded-r-xs border border-primary bg-white shadow-xs ring-ring/50 transition-[box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden translate-x-0 cursor-grab active:cursor-grabbing",
        activeThumb === 1 && "ring-4 z-10"
      )}
      style="left: {rightPct}%;"
      onpointerdown={(e) => handlePointerDown(1, e)}
      onpointermove={(e) => handlePointerMove(1, e)}
      onpointerup={(e) => handlePointerUp(1, e)}
      onpointercancel={(e) => handlePointerUp(1, e)}
    ></button>
  </div>
</div>
