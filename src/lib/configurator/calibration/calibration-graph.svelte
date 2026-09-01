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
  import { keyboardContext } from "$lib/keyboard"
  import { displayDistance } from "$lib/distance"
  import { analogInfoQueryContext } from "../queries/analog-info-query.svelte"
  import { calibrationQueryContext } from "../queries/calibration.query.svelte"
  import { onDestroy, onMount } from "svelte"

  const keyboard = keyboardContext.get()
  const {
    metadata: { numKeys, adcResolution },
  } = keyboard

  const analogInfoQuery = analogInfoQueryContext.get()
  const calibrationQuery = calibrationQueryContext.get()

  const { current: analogInfo } = $derived(analogInfoQuery.analogInfo)
  const { current: calibration } = $derived(calibrationQuery.calibration)

  let selectedKey = $state(0)
  let viewMode = $state<"adc" | "distance">("adc")
  let canvasEl: HTMLCanvasElement | null = $state(null)

  // Buffer of historical values for the graph (up to 240 samples = ~4-6 seconds)
  const MAX_HISTORY = 240
  let history: number[] = []
  let noisePeakToPeak = $state(0)
  let noiseMin = $state(0)
  let noiseMax = $state(0)
  let animFrameId: number | null = null

  // Push new data point when analogInfo updates
  $effect(() => {
    if (!analogInfo || !analogInfo[selectedKey]) return

    const keyData = analogInfo[selectedKey]
    const value =
      viewMode === "adc"
        ? keyData.adcValue
        : (keyData.distance / 10000) *
          ((calibration?.switchTravel[selectedKey] ?? 36) / 10)

    history.push(value)
    if (history.length > MAX_HISTORY) {
      history.shift()
    }

    // Calculate peak-to-peak noise over the last 30 samples (~1 second)
    const recent = history.slice(-30)
    if (recent.length > 2) {
      noiseMin = Math.min(...recent)
      noiseMax = Math.max(...recent)
      noisePeakToPeak = noiseMax - noiseMin
    }
  })

  function draw() {
    if (!canvasEl) return
    const ctx = canvasEl.getContext("2d")
    if (!ctx) return

    const width = canvasEl.width
    const height = canvasEl.height

    // Clear background
    ctx.fillStyle = "#0c0d12"
    ctx.fillRect(0, 0, width, height)

    // Draw grid lines
    ctx.strokeStyle = "#1a1d28"
    ctx.lineWidth = 1

    const gridLinesY = 4
    for (let i = 1; i < gridLinesY; i++) {
      const y = (height / gridLinesY) * i
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    const gridLinesX = 8
    for (let i = 1; i < gridLinesX; i++) {
      const x = (width / gridLinesX) * i
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }

    if (history.length < 2) {
      animFrameId = requestAnimationFrame(draw)
      return
    }

    // Determine scale range
    const maxVal =
      viewMode === "adc"
        ? 1 << adcResolution
        : (calibration?.switchTravel[selectedKey] ?? 36) / 10
    const minVal = 0

    // Compute dynamic auto-zoom around active range for ADC mode
    let plotMin = minVal
    let plotMax = maxVal

    if (viewMode === "adc" && history.length > 0) {
      const currentMin = Math.min(...history)
      const currentMax = Math.max(...history)
      const padding = Math.max(30, (currentMax - currentMin) * 0.2)
      plotMin = Math.max(0, currentMin - padding)
      plotMax = Math.min(1 << adcResolution, currentMax + padding)
    }

    function getY(val: number) {
      const normalized = (val - plotMin) / (plotMax - plotMin || 1)
      return height - normalized * (height - 20) - 10
    }

    // Draw Waveform Glow & Area
    const stepX = width / (MAX_HISTORY - 1)
    const startX = width - (history.length - 1) * stepX

    // Area gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, "rgba(56, 189, 248, 0.25)")
    gradient.addColorStop(1, "rgba(56, 189, 248, 0.0)")

    ctx.beginPath()
    ctx.moveTo(startX, getY(history[0]))
    for (let i = 1; i < history.length; i++) {
      ctx.lineTo(startX + i * stepX, getY(history[i]))
    }
    ctx.lineTo(width, height)
    ctx.lineTo(startX, height)
    ctx.closePath()
    ctx.fillStyle = gradient
    ctx.fill()

    // Trace Line
    ctx.beginPath()
    ctx.strokeStyle = "#38bdf8"
    ctx.lineWidth = 2.2
    ctx.lineJoin = "round"
    ctx.lineCap = "round"

    for (let i = 0; i < history.length; i++) {
      const x = startX + i * stepX
      const y = getY(history[i])
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    // Draw Current Value Head Dot
    const latestX = width
    const latestY = getY(history[history.length - 1])

    ctx.beginPath()
    ctx.arc(latestX, latestY, 5, 0, Math.PI * 2)
    ctx.fillStyle = "#38bdf8"
    ctx.fill()
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Draw Min/Max bounds indicators
    ctx.fillStyle = "#64748b"
    ctx.font = "10px ui-monospace, monospace"
    ctx.fillText(`${plotMax.toFixed(0)}`, 8, 14)
    ctx.fillText(`${plotMin.toFixed(0)}`, 8, height - 6)

    animFrameId = requestAnimationFrame(draw)
  }

  onMount(() => {
    if (canvasEl) {
      canvasEl.width = canvasEl.clientWidth * window.devicePixelRatio
      canvasEl.height = canvasEl.clientHeight * window.devicePixelRatio
      const ctx = canvasEl.getContext("2d")
      if (ctx) ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    animFrameId = requestAnimationFrame(draw)
  })

  onDestroy(() => {
    if (animFrameId) cancelAnimationFrame(animFrameId)
  })
</script>

<div class="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <span class="size-2.5 rounded-full bg-sky-400 animate-pulse"></span>
      <div class="font-semibold text-sm">Real-Time Sensor Oscilloscope</div>
    </div>
    <div class="flex items-center gap-2">
      <!-- Mode Toggle -->
      <div class="flex rounded-md border bg-muted/40 p-0.5 text-xs">
        <button
          class="rounded px-2.5 py-1 font-medium transition-colors {viewMode === 'adc' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
          onclick={() => {
            viewMode = "adc"
            history = []
          }}
        >
          ADC Counts
        </button>
        <button
          class="rounded px-2.5 py-1 font-medium transition-colors {viewMode === 'distance' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
          onclick={() => {
            viewMode = "distance"
            history = []
          }}
        >
          Distance (mm)
        </button>
      </div>

      <!-- Key Selector -->
      <select
        bind:value={selectedKey}
        class="rounded-md border bg-background px-2.5 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-sky-500"
        onchange={() => (history = [])}
      >
        {#each Array(numKeys).keys() as key}
          <option value={key}>Key {key + 1}</option>
        {/each}
      </select>
    </div>
  </div>

  <!-- Realtime Canvas -->
  <div class="relative h-44 w-full overflow-hidden rounded-md border bg-[#0c0d12]">
    <canvas
      bind:this={canvasEl}
      class="size-full"
    ></canvas>
  </div>

  <!-- Live Stats Strip -->
  <div class="grid grid-cols-4 gap-2 pt-1">
    <div class="flex flex-col rounded-md border bg-muted/20 p-2.5">
      <span class="text-[11px] text-muted-foreground font-medium">Live Value</span>
      <span class="font-mono text-base font-bold text-sky-400">
        {#if analogInfo && analogInfo[selectedKey]}
          {viewMode === "adc"
            ? analogInfo[selectedKey].adcValue
            : displayDistance(analogInfo[selectedKey].distance, selectedKey, calibration)}
        {:else}
          --
        {/if}
      </span>
    </div>

    <div class="flex flex-col rounded-md border bg-muted/20 p-2.5">
      <span class="text-[11px] text-muted-foreground font-medium">Noise (Pk-to-Pk)</span>
      <span class="font-mono text-base font-bold {noisePeakToPeak <= 3 ? 'text-emerald-400' : noisePeakToPeak <= 8 ? 'text-amber-400' : 'text-rose-400'}">
        {viewMode === "adc"
          ? `±${(noisePeakToPeak / 2).toFixed(1)} counts`
          : `±${(noisePeakToPeak / 2).toFixed(3)} mm`}
      </span>
    </div>

    <div class="flex flex-col rounded-md border bg-muted/20 p-2.5">
      <span class="text-[11px] text-muted-foreground font-medium">Rest Setting</span>
      <span class="font-mono text-base font-bold text-foreground">
        {calibration?.initialRestValue ?? "--"}
      </span>
    </div>

    <div class="flex flex-col rounded-md border bg-muted/20 p-2.5">
      <span class="text-[11px] text-muted-foreground font-medium">Bottom Out</span>
      <span class="font-mono text-base font-bold text-foreground">
        {calibration?.initialBottomOutThreshold ?? "--"}
      </span>
    </div>
  </div>
</div>
