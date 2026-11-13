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
  import { cn } from "$lib/utils"

  let {
    mode = "topdown",
    stemColor = "#14b8a6",
    housingColor = "rgba(20, 184, 166, 0.15)",
    currentMM = 1.6,
    maxTravelMM = 3.6,
    class: className = "",
    size = 48,
  }: {
    mode?: "topdown" | "crosssection"
    stemColor?: string
    housingColor?: string
    currentMM?: number
    maxTravelMM?: number
    class?: string
    size?: number
  } = $props()

  const travelPercent = $derived(
    Math.max(0, Math.min(1, maxTravelMM > 0 ? currentMM / maxTravelMM : 0)),
  )
  // Cross section max displacement in SVG coordinates (16 units max travel)
  const stemOffsetPx = $derived(travelPercent * 16)
</script>

{#if mode === "topdown"}
  <svg
    viewBox="0 0 48 48"
    width={size}
    height={size}
    class={cn("overflow-visible select-none drop-shadow-xs", className)}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <!-- Outer Switch Housing -->
    <rect
      x="4"
      y="4"
      width="40"
      height="40"
      rx="6"
      fill={housingColor}
      stroke="currentColor"
      stroke-width="1.5"
      class="text-border/60 transition-colors"
    />

    <!-- Housing Corner Clips / Latches -->
    <rect x="6" y="2" width="4" height="3" rx="1" fill="currentColor" class="text-border/80" />
    <rect x="38" y="2" width="4" height="3" rx="1" fill="currentColor" class="text-border/80" />
    <rect x="6" y="43" width="4" height="3" rx="1" fill="currentColor" class="text-border/80" />
    <rect x="38" y="43" width="4" height="3" rx="1" fill="currentColor" class="text-border/80" />

    <!-- Inner Well Rim -->
    <rect
      x="9"
      y="9"
      width="30"
      height="30"
      rx="4"
      fill="currentColor"
      class="text-background/40"
      stroke="currentColor"
      stroke-width="1"
      stroke-opacity="0.3"
    />

    <!-- Center Circular Guide -->
    <circle
      cx="24"
      cy="24"
      r="10"
      fill="currentColor"
      class="text-background/60"
      stroke="currentColor"
      stroke-width="1"
      stroke-opacity="0.4"
    />

    <!-- Cross Stem (+) -->
    <!-- Vertical bar -->
    <rect
      x="21.5"
      y="16"
      width="5"
      height="16"
      rx="1.5"
      fill={stemColor}
      stroke="rgba(0,0,0,0.25)"
      stroke-width="0.8"
    />
    <!-- Horizontal bar -->
    <rect
      x="16"
      y="21.5"
      width="16"
      height="5"
      rx="1.5"
      fill={stemColor}
      stroke="rgba(0,0,0,0.25)"
      stroke-width="0.8"
    />

    <!-- Center Box-Stem Stabilizer Walls (Wooting / Box Style) -->
    <rect
      x="18"
      y="18"
      width="12"
      height="12"
      rx="1.5"
      fill="none"
      stroke={stemColor}
      stroke-width="1.5"
      stroke-opacity="0.9"
    />
  </svg>
{:else}
  <!-- Cross-Section Mechanical Cutaway for Performance Slider -->
  <div class={cn("relative flex flex-col items-center justify-center p-2 rounded-xl border border-border/40 bg-card/40 select-none", className)}>
    <svg
      viewBox="0 0 64 80"
      width="72"
      height="90"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class="overflow-visible"
    >
      <defs>
        <linearGradient id="housingGrad" x1="0" y1="0" x2="64" y2="80" gradientUnits="userSpaceOnUse">
          <stop stop-color="currentColor" stop-opacity="0.15" />
          <stop offset="1" stop-color="currentColor" stop-opacity="0.05" />
        </linearGradient>
      </defs>

      <!-- Bottom Housing Base -->
      <path
        d="M10 50 L10 72 Q10 75 14 75 L50 75 Q54 75 54 72 L54 50 Z"
        fill="url(#housingGrad)"
        stroke="currentColor"
        stroke-width="1.5"
        class="text-border/70"
      />

      <!-- Hall Sensor on PCB (Bottom) -->
      <rect x="26" y="73" width="12" height="4" rx="1" fill="#3b82f6" opacity="0.9" />
      <text x="32" y="76" font-size="2.5" fill="#ffffff" text-anchor="middle" font-weight="bold">HE</text>

      <!-- Center Spring Under Stem -->
      <path
        d="M27 48 Q37 51 27 54 Q37 57 27 60 Q37 63 27 66 Q37 69 32 72"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        class="text-muted-foreground/60"
      />

      <!-- Top Housing Outer Shell -->
      <path
        d="M8 50 L14 18 Q16 14 20 14 L44 14 Q48 14 50 18 L56 50 Z"
        fill={housingColor}
        stroke="currentColor"
        stroke-width="1.5"
        class="text-border/80"
      />

      <!-- Moving Stem Group (Dynamically Translated based on Actuation) -->
      <g style="transform: translateY({stemOffsetPx}px); transition: transform 120ms ease-out;">
        <!-- Cross Stem Top -->
        <rect x="28" y="2" width="8" height="14" rx="1.5" fill={stemColor} />
        <rect x="22" y="5" width="20" height="5" rx="1.5" fill={stemColor} />
        
        <!-- Stem Core Body -->
        <path
          d="M22 16 L42 16 L38 46 L26 46 Z"
          fill={stemColor}
          stroke="rgba(0,0,0,0.3)"
          stroke-width="1"
        />

        <!-- Embedded Neodymium Magnet at Bottom of Stem -->
        <rect x="28" y="42" width="8" height="6" rx="1" fill="#ef4444" stroke="#991b1b" stroke-width="0.8" />
        <line x1="28" y1="45" x2="36" y2="45" stroke="#ffffff" stroke-width="0.8" opacity="0.8" />
        <text x="32" y="44.5" font-size="2.5" fill="#ffffff" text-anchor="middle" font-weight="bold">N</text>
        <text x="32" y="47.5" font-size="2.5" fill="#ffffff" text-anchor="middle" font-weight="bold">S</text>
      </g>

      <!-- Actuation Trigger Level Indicator Line -->
      <line
        x1="4"
        y1={16 + stemOffsetPx}
        x2="60"
        y2={16 + stemOffsetPx}
        stroke="#ef4444"
        stroke-width="1.2"
        stroke-dasharray="2 2"
        opacity="0.85"
      />
      <!-- Little triangle arrow pointing at trigger level -->
      <polygon
        points="3,{16 + stemOffsetPx} 0,{14 + stemOffsetPx} 0,{18 + stemOffsetPx}"
        fill="#ef4444"
      />
    </svg>

    <!-- Travel readout -->
    <div class="mt-1 flex flex-col items-center">
      <span class="text-xs font-bold text-foreground">
        {currentMM.toFixed(2)} <span class="text-[10px] text-muted-foreground font-normal">mm</span>
      </span>
      <span class="text-[9px] uppercase tracking-wider text-muted-foreground">
        Stem Position
      </span>
    </div>
  </div>
{/if}
