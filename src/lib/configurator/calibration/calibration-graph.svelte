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
  let containerEl: HTMLDivElement | null = $state(null)
  let canvasEl: HTMLCanvasElement | null = $state(null)

  interface Sample {
    time: number
    value: number
    isPressed: boolean
  }

  const TIME_WINDOW_MS = 1500
  let history: Sample[] = []
  let noisePeakToPeak = $state(0)
  let prevKey = -1
  let animFrameId: number | null = null
  let isPressedLive = $state(false)
  let smoothMin = 0
  let smoothMax = 4096
  let scaleInitialized = false
  let prevViewMode: "adc" | "distance" = "adc"

  // Reset buffer when selected key changes
  $effect(() => {
    if (selectedKey !== prevKey) {
      history = []
      prevKey = selectedKey
      scaleInitialized = false
    }
  })

  // Capture incoming analog info
  $effect(() => {
    if (!analogInfo || !analogInfo[selectedKey]) return

    const keyData = analogInfo[selectedKey]
    const rawStatus = keyData.status ?? 0
    const isPressed = (rawStatus & 0x80) !== 0 || keyData.distance > 1500
    isPressedLive = isPressed

    const value =
      viewMode === "adc"
        ? keyData.adcValue
        : (keyData.distance / 10000) *
          ((calibration?.switchTravel[selectedKey] ?? 36) / 10)

    const now = performance.now()
    history.push({ time: now, value, isPressed })

    // Efficient buffer pruning (keep within time window + 500ms margin)
    const cutoff = now - TIME_WINDOW_MS - 500
    if (history.length > 50 && history[0].time < cutoff) {
      const idx = history.findIndex((s) => s.time >= cutoff)
      if (idx > 0) history = history.slice(idx)
    }

    // Calculate peak-to-peak noise over the last 30 samples only when stationary
    const recent = history.slice(-30)
    if (recent.length >= 10) {
      const first = recent[0].value
      const last = recent[recent.length - 1].value
      const isStationary =
        viewMode === "adc"
          ? Math.abs(last - first) <= 6
          : Math.abs(last - first) <= 0.05
      if (isStationary) {
        let min = recent[0].value
        let max = recent[0].value
        for (let i = 1; i < recent.length; i++) {
          const v = recent[i].value
          if (v < min) min = v
          if (v > max) max = v
        }
        noisePeakToPeak = max - min
      }
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

    // Calculate target Y scale
    let targetMin = 0
    let targetMax = (calibration?.switchTravel[selectedKey] ?? 36) / 10

    if (viewMode === "adc") {
      let curMin = history[0].value
      let curMax = history[0].value
      for (let i = 1; i < history.length; i++) {
        const v = history[i].value
        if (v < curMin) curMin = v
        if (v > curMax) curMax = v
      }
      const span = curMax - curMin
      const pad = Math.max(30, span * 0.25)
      targetMin = Math.max(0, curMin - pad)
      targetMax = Math.min(1 << adcResolution, curMax + pad)
    }

    if (!scaleInitialized || viewMode !== prevViewMode) {
      smoothMin = targetMin
      smoothMax = targetMax
      scaleInitialized = true
      prevViewMode = viewMode
    } else {
      // Smooth lerp to prevent jarring vertical jumps
      smoothMin += (targetMin - smoothMin) * 0.12
      smoothMax += (targetMax - smoothMax) * 0.12
    }

    // getY maps rest to top (14) and bottom-out to bottom (h - 14)
    function getY(val: number) {
      const norm = (val - smoothMin) / (smoothMax - smoothMin || 1)
      const clamped = Math.max(0, Math.min(1, norm))
      return clamped * (h - 28) + 14
    }

    const now = performance.now()
    const latestSample = history[history.length - 1]
    const isPressed = latestSample.isPressed
    const traceColor = isPressed ? "#22c55e" : "#38bdf8"

    // Continuous timebase scrolling: right edge is 'now'
    const getX = (t: number) => w - ((now - t) / TIME_WINDOW_MS) * w

    const firstX = Math.max(0, getX(history[0].time))
    const lastY = getY(latestSample.value)

    // Gradient Fill from bottom baseline up to trace line
    const gradient = ctx.createLinearGradient(0, h, 0, 0)
    if (isPressed) {
      gradient.addColorStop(0, "rgba(34, 197, 94, 0.35)")
      gradient.addColorStop(1, "rgba(34, 197, 94, 0.02)")
    } else {
      gradient.addColorStop(0, "rgba(56, 189, 248, 0.28)")
      gradient.addColorStop(1, "rgba(56, 189, 248, 0.02)")
    }

    ctx.beginPath()
    ctx.moveTo(firstX, h)
    for (let i = 0; i < history.length; i++) {
      const s = history[i]
      const x = Math.max(0, Math.min(w, getX(s.time)))
      const y = getY(s.value)
      ctx.lineTo(x, y)
    }
    ctx.lineTo(w, lastY)
    ctx.lineTo(w, h)
    ctx.closePath()
    ctx.fillStyle = gradient
    ctx.fill()

    // Trace Line
    ctx.beginPath()
    ctx.strokeStyle = traceColor
    ctx.lineWidth = 2
    ctx.lineJoin = "round"
    ctx.lineCap = "round"

    for (let i = 0; i < history.length; i++) {
      const s = history[i]
      const x = Math.max(0, Math.min(w, getX(s.time)))
      const y = getY(s.value)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.lineTo(w, lastY)
    ctx.stroke()

    // Current Value Dot at right edge
    ctx.beginPath()
    ctx.arc(w - 3, lastY, 4.5, 0, Math.PI * 2)
    ctx.fillStyle = traceColor
    ctx.fill()
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Scale numbers (top = rest/min, bottom = pressed/bottom-out)
    ctx.fillStyle = "#64748b"
    ctx.font = "10px ui-monospace, monospace"
    ctx.textAlign = "left"
    ctx.fillText(
      `${viewMode === "distance" ? smoothMin.toFixed(2) + " mm" : smoothMin.toFixed(0)}`,
      8,
      14,
    )
    ctx.fillText(
      `${viewMode === "distance" ? smoothMax.toFixed(2) + " mm" : smoothMax.toFixed(0)}`,
      8,
      h - 6,
    )

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
      <span
        class="size-2.5 rounded-full {isPressedLive ? 'bg-emerald-400' : 'bg-sky-400'} animate-pulse"
      ></span>
      <div class="font-semibold text-sm">
        Live Oscilloscope &mdash; <span class="{isPressedLive ? 'text-emerald-400' : 'text-sky-400'} font-mono">Key {selectedKey + 1}</span>
      </div>
      {#if isPressedLive}
        <span class="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300 border border-emerald-500/30">
          Pressed
        </span>
      {/if}
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

  <!-- Realtime Canvas and Side Stats -->
  <div class="flex gap-3">
    <!-- Realtime Canvas Container -->
    <div
      bind:this={containerEl}
      class="relative h-48 flex-1 overflow-hidden rounded-md border bg-[#090a0f]"
    >
      <canvas
        bind:this={canvasEl}
        class="size-full block"
      ></canvas>
    </div>

    <!-- Live Stats Side Column -->
    <div class="flex w-36 shrink-0 flex-col gap-2">
      <div class="flex flex-1 flex-col justify-center rounded-md border bg-muted/20 p-2.5">
        <span class="text-[11px] font-medium text-muted-foreground">Live Value</span>
        <span class="font-mono text-base font-bold {isPressedLive ? 'text-emerald-400' : 'text-sky-400'}">
          {#if analogInfo && analogInfo[selectedKey]}
            {viewMode === "adc"
              ? analogInfo[selectedKey].adcValue
              : displayDistance(analogInfo[selectedKey].distance, selectedKey, calibration)}
          {:else}
            --
          {/if}
        </span>
      </div>

      <div class="flex flex-1 flex-col justify-center rounded-md border bg-muted/20 p-2.5">
        <span class="text-[11px] font-medium text-muted-foreground">Noise (Pk-to-Pk)</span>
        <span class="font-mono text-base font-bold {noisePeakToPeak <= 3 ? 'text-emerald-400' : noisePeakToPeak <= 8 ? 'text-amber-400' : 'text-rose-400'}">
          {viewMode === "adc"
            ? `±${(noisePeakToPeak / 2).toFixed(1)} counts`
            : `±${(noisePeakToPeak / 2).toFixed(2)} mm`}
        </span>
      </div>
    </div>
  </div>
</div>
