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
    min = 0,
    max = 4.0,
    step = 0.01,
    committed = $bindable([0, 4.0]),
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
    committed?: [number, number]
    display?: (v: [number, number]) => string
    onCommit?: (v: [number, number]) => void
  } = $props()

  let value = $state<[number, number]>([0, 4.0])

  $effect(() => {
    if (committed !== undefined) {
      value = [committed[0], committed[1]]
    }
  })
  function clampValues(v: number[]): [number, number] {
    if (!Array.isArray(v) || v.length < 2) return [min, max]
    let v0 = Math.max(min, Math.min(v[0], max - step))
    let v1 = Math.max(min + step, Math.min(v[1], max))
    const gap = step
    if (v1 < v0 + gap) {
      if (Math.abs(v[0] - value[0]) > 0.0001) {
        // Left nub pushed right -> push right nub forward
        v1 = Math.min(max, v0 + gap)
        v0 = Math.max(min, v1 - gap)
      } else {
        // Right nub pushed left -> push left nub backward
        v0 = Math.max(min, v1 - gap)
        v1 = Math.min(max, v0 + gap)
      }
    }
    return [v0, v1]
  }
</script>

<div class={cn("flex flex-col", className)} {...props}>
  <div class={cn("grid text-sm text-wrap", disabled && "opacity-50")}>
    <span class="font-medium">
      {title}: {display?.(value) ?? `${value[0].toFixed(2)}mm - ${value[1].toFixed(2)}mm`}
    </span>
    {#if description}
      <span class="text-muted-foreground">{description}</span>
    {/if}
  </div>
  <Slider
    value={value}
    onValueChange={(v) => {
      value = clampValues(v)
    }}
    class="mt-3"
    {disabled}
    {min}
    {max}
    onValueCommit={(v) => {
      const clamped = clampValues(v)
      committed = clamped
      onCommit?.(clamped)
    }}
    {step}
    type="multiple"
  />
</div>
