<script lang="ts">
  import { cn, type WithoutChildrenOrChild } from "$lib/utils.js"
  import { Slider as SliderPrimitive } from "bits-ui"

  let {
    ref = $bindable(null),
    value = $bindable(),
    orientation = "horizontal",
    class: className,
    ...restProps
  }: WithoutChildrenOrChild<SliderPrimitive.RootProps> = $props()
</script>

<!--
Discriminated Unions + Destructing (required for bindable) do not
get along, so we shut typescript up by casting `value` to `never`.
-->
<SliderPrimitive.Root
  bind:ref
  bind:value={value as never}
  data-slot="slider"
  {orientation}
  class={cn(
    "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
    className,
  )}
  {...restProps}
>
  {#snippet children({ thumbs })}
    <span
      data-orientation={orientation}
      data-slot="slider-track"
      class={cn(
        "relative grow overflow-hidden rounded-full bg-muted data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5",
      )}
    >
      <SliderPrimitive.Range
        data-slot="slider-range"
        class={cn(
          "absolute bg-primary data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full data-[orientation=vertical]:top-0 data-[orientation=vertical]:!bottom-auto",
        )}
      />
    </span>
    {#each thumbs as thumb (thumb)}
      <SliderPrimitive.Thumb
        data-slot="slider-thumb"
        index={thumb}
        class={cn(
          "block shrink-0 rounded-xs border border-primary bg-white shadow-xs ring-ring/50 transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50",
          orientation === "vertical" ? "w-4 h-2" : "w-2 h-4"
        )}
      />
    {/each}
  {/snippet}
</SliderPrimitive.Root>
