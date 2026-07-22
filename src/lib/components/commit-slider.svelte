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
  let isDragging = $state(false)

  $effect(() => {
    if (committed !== undefined && !isDragging) {
      value = committed
    }
  })
</script>

<div
  class={cn("flex flex-col", className)}
  onpointerdown={() => { isDragging = true }}
  onpointerup={() => { isDragging = false }}
  onpointercancel={() => { isDragging = false }}
  {...props}
>
  <div class={cn("flex items-center justify-between text-sm gap-2", disabled && "opacity-50")}>
    <div class="flex flex-col text-wrap">
      <span class="font-medium">{title}</span>
      {#if description}
        <span class="text-xs text-muted-foreground">{description}</span>
      {/if}
    </div>
    <div class="flex items-center gap-1 shrink-0 bg-muted/40 border rounded-md px-1.5 py-0.5">
      <input
        type="number"
        step={step ?? 0.01}
        min={min ?? 0}
        max={max ?? 100}
        {disabled}
        value={value}
        onchange={(e) => {
          const num = parseFloat((e.currentTarget as HTMLInputElement).value)
          if (!isNaN(num)) {
            const clamped = Math.max(min ?? 0, Math.min(num, max ?? 100))
            value = Number(clamped.toFixed(4))
            committed = value
            onCommit?.(value)
          }
        }}
        class="w-14 text-right bg-transparent text-sm font-semibold focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    </div>
  </div>
  <Slider
    bind:value
    class="mt-3"
    {disabled}
    {min}
    {max}
    onValueCommit={(v) => {
      committed = v
      onCommit?.(v)
    }}
    {step}
    type="single"
  />
</div>
