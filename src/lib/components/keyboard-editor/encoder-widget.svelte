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
  import { getKeycodeMetadata } from "$lib/keycodes"
  import { unitToEMString } from "$lib/ui"
  import { cn } from "$lib/utils"

  let {
    x,
    y,
    w = 1,
    h = 1,
    keys,
    buttonKey,
    ccwKeycode,
    cwKeycode,
    btnKeycode,
    leftSelected = false,
    rightSelected = false,
    buttonSelected = false,
    interactive = false,
    onclick,
  } = $props<{
    x: number
    y: number
    w?: number
    h?: number
    keys: [number, number]
    buttonKey?: number
    ccwKeycode?: number
    cwKeycode?: number
    btnKeycode?: number
    leftSelected?: boolean
    rightSelected?: boolean
    buttonSelected?: boolean
    interactive?: boolean
    onclick?: (key: number) => void
  }>()
</script>

<div
  class="absolute flex items-center justify-center overflow-hidden rounded-full border-2 border-muted-foreground/20 bg-background shadow-sm"
  style:left={unitToEMString(x)}
  style:top={unitToEMString(y)}
  style:width={unitToEMString(w)}
  style:height={unitToEMString(h)}
>
  <!-- Left Half (CCW) -->
  <button
    class={cn(
      "flex h-full w-1/2 flex-col items-center justify-center pr-2 sm:pr-4 border-r border-muted-foreground/20 transition-colors",
      interactive ? "hover:bg-accent" : "cursor-default opacity-50",
      leftSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
    )}
    onclick={() => onclick?.(keys[0])}
  >
    {#if ccwKeycode === undefined}
      <span class="text-[10px] font-bold">CCW</span>
    {/if}
    {#if ccwKeycode !== undefined}
      {@const meta = getKeycodeMetadata(ccwKeycode)}
      {#each meta.display ?? [meta.name] as Variant, i (i)}
        {#if typeof Variant === "string"}
          <span
            class={cn(
              "max-w-full overflow-hidden px-1 text-[16px] leading-[1.1em] text-ellipsis whitespace-pre-wrap",
              leftSelected ? "text-primary-foreground/80" : "text-muted-foreground",
            )}>{Variant}</span
          >
        {:else}
          <div class={cn("[&>svg]:size-5", leftSelected ? "text-primary-foreground/80" : "text-muted-foreground")}>
            <Variant />
          </div>
        {/if}
      {/each}
    {/if}
  </button>

  <!-- Right Half (CW) -->
  <button
    class={cn(
      "flex h-full w-1/2 flex-col items-center justify-center pl-2 sm:pl-4 transition-colors",
      interactive ? "hover:bg-accent" : "cursor-default opacity-50",
      rightSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
    )}
    onclick={() => onclick?.(keys[1])}
  >
    {#if cwKeycode === undefined}
      <span class="text-[10px] font-bold">CW</span>
    {/if}
    {#if cwKeycode !== undefined}
      {@const meta = getKeycodeMetadata(cwKeycode)}
      {#each meta.display ?? [meta.name] as Variant, i (i)}
        {#if typeof Variant === "string"}
          <span
            class={cn(
              "max-w-full overflow-hidden px-1 text-[16px] leading-[1.1em] text-ellipsis whitespace-pre-wrap",
              rightSelected
                ? "text-primary-foreground/80"
                : "text-muted-foreground",
            )}>{Variant}</span
          >
        {:else}
          <div class={cn("[&>svg]:size-5", rightSelected ? "text-primary-foreground/80" : "text-muted-foreground")}>
            <Variant />
          </div>
        {/if}
      {/each}
    {/if}
  </button>

  <!-- Center Button -->
  {#if buttonKey !== undefined}
    <button
      class={cn(
        "absolute flex h-1/2 w-1/2 flex-col items-center justify-center rounded-full border-2 border-background bg-muted-foreground/20 transition-colors",
        interactive ? "hover:bg-accent" : "cursor-default opacity-50",
        buttonSelected &&
          "bg-primary text-primary-foreground hover:bg-primary/90",
      )}
      onclick={() => onclick?.(buttonKey)}
    >
      {#if btnKeycode === undefined}
        <span class="text-[10px] font-bold">BTN</span>
      {/if}
      {#if btnKeycode !== undefined}
        {@const meta = getKeycodeMetadata(btnKeycode)}
        {#each meta.display ?? [meta.name] as Variant, i (i)}
          {#if typeof Variant === "string"}
            <span
              class={cn(
                "max-w-full overflow-hidden px-1 text-[16px] leading-[1.1em] text-ellipsis whitespace-pre-wrap",
                buttonSelected
                  ? "text-primary-foreground/80"
                  : "text-muted-foreground",
              )}>{Variant}</span
            >
          {:else}
            <div class={cn("[&>svg]:size-5", buttonSelected ? "text-primary-foreground/80" : "text-muted-foreground")}>
              <Variant />
            </div>
          {/if}
        {/each}
      {/if}
    </button>
  {:else}
    <!-- Center Cap -->
    <div
      class="pointer-events-none absolute size-4 rounded-full border-2 border-background bg-muted-foreground/20"
    ></div>
  {/if}
</div>
