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
  import { calibrationStateContext } from "../context.svelte"
  import { onDestroy, onMount } from "svelte"

  const keyboard = keyboardContext.get()
  const {
    metadata: { adcResolution },
  } = keyboard

  const analogInfoQuery = analogInfoQueryContext.get()
  const calibrationQuery = calibrationQueryContext.get()
  const calibrationState = calibrationStateContext.get()

  const { current: analogInfo } = $derived(analogInfoQuery.analogInfo)
  const { current: calibration } = $derived(calibrationQuery.calibration)

  const selectedKey = $derived(calibrationState.selectedKey)

  let viewMode = $state<"adc" | "distance">("adc")
  let scrollSpeed = $state<"fast" | "normal">("fast")
  let containerEl: HTMLDivElement | null = $state(null)
  let canvasEl: HTMLCanvasElement | null = $state(null)

  const maxHistory = $derived(scrollSpeed === "fast" ? 80 : 160)
  let history: number[] = []
  let noisePeakToPeak = $state(0)
  let prevKey = -1
  let animFrameId: number | null = null

  // Reset buffer when selected key changes
  $effect(() => {
    if (selectedKey !== prevKey) {
      history = []
      prevKey = selectedKey
    }
  })

  // Capture incoming analog info
  $effect(() => {
    if (!analogInfo || !analogInfo[selectedKey]) return

    const keyData = analogInfo[selectedKey]
    const value =
      viewMode === "adc"
        ? keyData.adcValue
        : (keyData.distance / 10000) *
          ((calibration?.switchTravel[selectedKey] ?? 36) / 10)

    history.push(value)
    if (history.length > maxHistory) {
      history.shift()
    }

    // Calculate peak-to-peak noise over the last 30 samples
    const recent = history.slice(-30)
    if (recent.length > 2) {
      const min = Math.min(...recent)
      const max = Math.max(...recent)
      noisePeakToPeak = max - min
    }
  })

  function draw() {
    if (!canvasEl || !containerEl) {
      animFrameId = requestAnimationFrame(draw)
      return
    }

    // Sync canvas pixel resolution with container size
    const rect = containerEl.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const targetW = Math.floor(rect.width * dpr)
    const targetH = Math.floor(rect.height * dpr)

    if (targetW > 0 && targetH > 0) {
      if (canvasEl.width !== targetW || canvasEl.height !== targetH) {
        canvasEl.width = targetW
        canvasEl.height = targetH
      }
    }

    const ctx = canvasEl.getContext("2d")
    if (!ctx) {
      animFrameId = requestAnimationFrame(draw)
      return
    }

    const w = canvasEl.width / dpr
    const h = canvasEl.height / dpr

    ctx.save()
    ctx.scale(dpr, dpr)

    // Background
    ctx.fillStyle = "#090a0f"
    ctx.fillRect(0, 0, w, h)

    // Grid lines
    ctx.strokeStyle = "#161922"
    ctx.lineWidth = 1

    for (let i = 1; i < 4; i++) {
      const y = (h / 4) * i
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }

    for (let i = 1; i < 8; i++) {
      const x = (w / 8) * i
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    }

    if (history.length < 2) {
      // Empty state prompt
      ctx.fillStyle = "#475569"
      ctx.font = "12px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText("Waiting for real-time sensor stream...", w / 2, h / 2)
      ctx.restore()
      animFrameId = requestAnimationFrame(draw)
      return
    }

    // Calculate Y scale
    let plotMin = 0
    let plotMax =
      viewMode === "adc"
        ? 1 << adcResolution
        : (calibration?.switchTravel[selectedKey] ?? 36) / 10

    if (viewMode === "adc") {
      const curMin = Math.min(...history)
      const curMax = Math.max(...history)
      const span = curMax - curMin
      const pad = Math.max(25, span * 0.25)
      plotMin = Math.max(0, curMin - pad)
      plotMax = Math.min(1 << adcResolution, curMax + pad)
    }

    function getY(val: number) {
      const norm = (val - plotMin) / (plotMax - plotMin || 1)
      return h - norm * (h - 24) - 12
    }

    const stepX = w / (maxHistory - 1)
    const startX = w - (history.length - 1) * stepX

    // Gradient Fill
    const gradient = ctx.createLinearGradient(0, 0, 0, h)
    gradient.addColorStop(0, "rgba(56, 189, 248, 0.30)")
    gradient.addColorStop(1, "rgba(56, 189, 248, 0.0)")

    ctx.beginPath()
    ctx.moveTo(startX, getY(history[0]))
    for (let i = 1; i < history.length; i++) {
      ctx.lineTo(startX + i * stepX, getY(history[i]))
    }
    ctx.lineTo(w, h)
    ctx.lineTo(startX, h)
    ctx.closePath()
    ctx.fillStyle = gradient
    ctx.fill()

    // Trace Line
    ctx.beginPath()
    ctx.strokeStyle = "#38bdf8"
    ctx.lineWidth = 2
    ctx.lineJoin = "round"
    ctx.lineCap = "round"

    for (let i = 0; i < history.length; i++) {
      const x = startX + i * stepX
      const y = getY(history[i])
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    // Current Value Dot
    const lastX = w
    const lastY = getY(history[history.length - 1])

    ctx.beginPath()
    ctx.arc(lastX - 2, lastY, 4.5, 0, Math.PI * 2)
    ctx.fillStyle = "#38bdf8"
    ctx.fill()
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Scale numbers
    ctx.fillStyle = "#64748b"
    ctx.font = "10px ui-monospace, monospace"
    ctx.textAlign = "left"
    ctx.fillText(`${plotMax.toFixed(0)}`, 8, 14)
    ctx.fillText(`${plotMin.toFixed(0)}`, 8, h - 6)

    ctx.restore()
    animFrameId = requestAnimationFrame(draw)
  }

  onMount(() => {
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
      <div class="font-semibold text-sm">
        Live Oscilloscope &mdash; <span class="text-sky-400 font-mono">Key {selectedKey + 1}</span>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <!-- Speed Toggle -->
      <div class="flex rounded-md border bg-muted/40 p-0.5 text-xs">
        <button
          class="rounded px-2 py-0.5 font-medium transition-colors {scrollSpeed === 'fast' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
          onclick={() => {
            scrollSpeed = "fast"
            history = []
          }}
        >
          Fast Scroll
        </button>
        <button
          class="rounded px-2 py-0.5 font-medium transition-colors {scrollSpeed === 'normal' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
          onclick={() => {
            scrollSpeed = "normal"
            history = []
          }}
        >
          Normal
        </button>
      </div>

      <!-- Mode Toggle -->
      <div class="flex rounded-md border bg-muted/40 p-0.5 text-xs">
        <button
          class="rounded px-2 py-0.5 font-medium transition-colors {viewMode === 'adc' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
          onclick={() => {
            viewMode = "adc"
            history = []
          }}
        >
          ADC
        </button>
        <button
          class="rounded px-2 py-0.5 font-medium transition-colors {viewMode === 'distance' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
          onclick={() => {
            viewMode = "distance"
            history = []
          }}
        >
          Distance
        </button>
      </div>
    </div>
  </div>

  <!-- Realtime Canvas Container -->
  <div
    bind:this={containerEl}
    class="relative h-48 w-full overflow-hidden rounded-md border bg-[#090a0f]"
  >
    <canvas
      bind:this={canvasEl}
      class="size-full block"
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
