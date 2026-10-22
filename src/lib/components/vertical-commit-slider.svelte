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
  import { Slider } from "./ui/slider"

  let {
    class: className,
    disabled,
    locked = false,
    lockedMessage = "Select Custom on switch selector to chage travel depth",
    title,
    description,
    min,
    max,
    step,
    committed = $bindable(),
    display,
    onCommit,
    ...props
  }: WithoutChildren<HTMLAttributes<HTMLDivElement>> & {
    disabled?: boolean
    locked?: boolean
    lockedMessage?: string
    title: string
    description?: string
    min?: number
    max?: number
    step?: number
    committed?: number
    display?: (v: number) => string
    onCommit?: (v: number) => void
  } = $props()

  let value = $state(0)
  let trackRef = $state<HTMLDivElement | null>(null)
  let isDragging = $state(false)
  let isHovered = $state(false)

  $effect(() => {
    if (committed !== undefined && !isDragging) {
      value = committed
    }
  })

  const isInteractionDisabled = $derived(disabled || locked)
  const minVal = $derived(min ?? 0)
  const maxVal = $derived(max ?? 4.0)
  const stepVal = $derived(step ?? 0.01)

  const range = $derived(maxVal > minVal ? maxVal - minVal : 1)
  const pct = $derived(Math.max(0, Math.min(100, ((value - minVal) / range) * 100)))

  function getSteppedValue(raw: number): number {
    const clamped = Math.max(minVal, Math.min(raw, maxVal))
    const steps = Math.round((clamped - minVal) / stepVal)
    return Number((minVal + steps * stepVal).toFixed(4))
  }

  function handlePointerDown(e: PointerEvent) {
    if (isInteractionDisabled || !trackRef) return
    e.preventDefault()
    isDragging = true
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    updateFromPointer(e)
  }

  function handlePointerMove(e: PointerEvent) {
    if (!isDragging || !trackRef || isInteractionDisabled) return
    updateFromPointer(e)
  }

  function updateFromPointer(e: PointerEvent) {
    if (!trackRef) return
    const rect = trackRef.getBoundingClientRect()
    if (rect.height <= 0) return
    const topPct = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    const rawVal = minVal + topPct * range
    const stepped = getSteppedValue(rawVal)
    if (stepped !== value) {
      value = stepped
    }
  }

  function handlePointerUp(e: PointerEvent) {
    if (isDragging) {
      isDragging = false
      committed = value
      onCommit?.(value)
    }
  }
</script>

<div
  class={cn("flex flex-col items-center gap-3 size-full border rounded-lg p-4 bg-card/50 relative", className)}
  onmouseenter={() => (isHovered = true)}
  onmouseleave={() => (isHovered = false)}
  {...props}
>
  <div class={cn("flex flex-col items-center text-center text-sm", disabled && "opacity-50")}>
    <span class="font-semibold text-base">{title}</span>
    <div class="flex items-center gap-1 mt-1 bg-muted/40 border rounded-md px-2 py-0.5">
      <input
        type="number"
        step={stepVal}
        min={minVal}
        max={maxVal}
        disabled={isInteractionDisabled}
        value={value}
        onchange={(e) => {
          const num = parseFloat((e.currentTarget as HTMLInputElement).value)
          if (!isNaN(num)) {
            const clamped = Math.max(minVal, Math.min(num, maxVal))
            value = Number(clamped.toFixed(4))
            committed = value
            onCommit?.(value)
          }
        }}
        class={cn(
          "w-14 text-center bg-transparent text-sm font-semibold focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          locked && "cursor-not-allowed opacity-75"
        )}
      />
      <span class="text-xs text-muted-foreground font-medium">mm</span>
    </div>
    {#if locked && isHovered}
      <span class="text-xs text-amber-500 dark:text-amber-400 font-medium mt-1 max-w-44 leading-tight animate-in fade-in duration-150">
        {lockedMessage}
      </span>
    {:else if description}
      <span class="text-xs text-muted-foreground mt-1 max-w-40">{description}</span>
    {/if}
  </div>
  <div class="flex-1 flex items-center justify-center min-h-36 h-40 py-1 relative">
    <div
      bind:this={trackRef}
      role="presentation"
      class={cn(
        "relative flex h-full w-4 touch-none select-none justify-center cursor-pointer",
        isInteractionDisabled && "opacity-50 pointer-events-none",
        locked && "cursor-not-allowed"
      )}
      onpointerdown={handlePointerDown}
      onpointermove={handlePointerMove}
      onpointerup={handlePointerUp}
      onpointercancel={handlePointerUp}
    >
      <div class="relative h-full w-1.5 overflow-hidden rounded-full bg-muted">
        <div
          class="absolute w-full bg-primary"
          style="top: 0; height: {pct}%;"
        ></div>
      </div>
      <button
        type="button"
        tabindex="0"
        aria-label="Slider Handle"
        class={cn(
          "absolute w-4 h-2 shrink-0 rounded-xs border border-primary bg-white shadow-xs ring-ring/50 transition-[box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden -translate-y-1/2 cursor-grab active:cursor-grabbing",
          isDragging && "ring-4 z-10",
          locked && "cursor-not-allowed"
        )}
        style="top: {pct}%;"
      ></button>
    </div>

    {#if locked && isHovered}
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 p-2 rounded-lg bg-popover/95 border border-border shadow-lg backdrop-blur-xs text-center text-xs font-medium text-amber-500 dark:text-amber-400 pointer-events-none z-30 animate-in fade-in zoom-in-95 duration-150">
        {lockedMessage}
      </div>
    {/if}
  </div>
</div>
