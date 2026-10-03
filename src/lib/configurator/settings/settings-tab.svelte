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
  import CommitSlider from "$lib/components/commit-slider.svelte"
  import FixedScrollArea from "$lib/components/fixed-scroll-area.svelte"
  import Switch from "$lib/components/switch.svelte"
  import { Badge } from "$lib/components/ui/badge"
  import { Button } from "$lib/components/ui/button"
  import * as Dialog from "$lib/components/ui/dialog"
  import { keyboardContext } from "$lib/keyboard"
  import { HMK_FIRMWARE_MAX_VERSION } from "$lib/libhmk"
  import {
    cn,
    displayVersion,
    isFeatureAvailable,
    isFirmwareUpdateAvailable,
    type WithoutChildren,
  } from "$lib/utils"
  import type { HTMLAttributes } from "svelte/elements"
  import { optionsQueryContext } from "../queries/options-query.svelte"
  import { profileQueryContext } from "../queries/profile-query.svelte"
  import { scanRateQueryContext } from "../queries/scan-rate-query.svelte"
  import { onDestroy } from "svelte"
  import FirmwareUpdateDialog from "./firmware-update-dialog.svelte"

  const {
    class: className,
    ...props
  }: WithoutChildren<HTMLAttributes<HTMLDivElement>> = $props()

  const keyboard = keyboardContext.get()
  const {
    demo,
    version,
    metadata: { usbHighSpeed },
  } = keyboard

  const profileQuery = profileQueryContext.get()
  const optionsQuery = optionsQueryContext.get()
  const scanRateQuery = scanRateQueryContext.get()
  const { current: options } = $derived(optionsQuery.options)
  const { current: scanRate } = $derived(scanRateQuery.scanRate)

  let liveBenchmark = $state(false)

  $effect(() => {
    scanRateQuery.enabled = liveBenchmark
  })

  onDestroy(() => {
    scanRateQuery.enabled = false
  })

  const updateAvailable = isFirmwareUpdateAvailable(version)
</script>

<div
  class={cn("mx-auto flex size-full max-w-3xl flex-col", className)}
  {...props}
>
  <FixedScrollArea class="flex flex-col gap-4 p-4">
    <CommitSlider
      min={0}
      max={10}
      step={1}
      committed={options?.debounceMs ?? 2}
      onCommit={(v) =>
        options &&
        optionsQuery.set({
          data: { ...options, debounceMs: v },
        })
      }
      title="Debounce Duration"
      description="This ignores unwanted keypresses caused by keys briefly bouncing back downwards when being released. This filter does not have an impact on latency."
      display={(v) => `${v}ms`}
    />
    {#if usbHighSpeed && isFeatureAvailable("pollingRateSwitch", version)}
      <Switch
        bind:checked={
          () => options?.highPollingRateEnabled ?? false,
          (v) =>
            options &&
            optionsQuery.set({
              data: { ...options, highPollingRateEnabled: v },
            })
        }
        id="8000hz-polling-rate"
        title="8000Hz Polling Rate"
        description="The polling rate determines how often the keyboard can report to the computer. A higher polling rate leads to quicker response times. You can lower the polling rate if you experience stability issues. Restart the keyboard to apply changes."
      />
    {/if}
    <div class="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
      <div class="flex items-center justify-between gap-2">
        <div class="grid text-sm text-wrap">
          <span class="font-semibold">Scan Rate & Latency Benchmark</span>
          <span class="text-muted-foreground">
            Real-time on-chip telemetry measuring key evaluation frequency, hardware ADC sweeps, and firmware loop latency.
          </span>
        </div>
        <Button
          size="sm"
          variant={liveBenchmark ? "default" : "outline"}
          onclick={() => (liveBenchmark = !liveBenchmark)}
        >
          {liveBenchmark ? "Stop Benchmark" : "Measure Scan Rate"}
        </Button>
      </div>
      {#if liveBenchmark && scanRate}
        <div class="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-4">
          <div class="flex flex-col rounded-md border bg-muted/20 p-2.5">
            <span class="text-[11px] font-medium text-muted-foreground">Matrix Scan Rate</span>
            <span class="font-mono text-base font-bold text-sky-400">
              {scanRate.evalRateHz.toLocaleString()} Hz
            </span>
            <span class="text-[10px] text-muted-foreground">Actuation loop</span>
          </div>
          <div class="flex flex-col rounded-md border bg-muted/20 p-2.5">
            <span class="text-[11px] font-medium text-muted-foreground">ADC Sweep Rate</span>
            <span class="font-mono text-base font-bold text-emerald-400">
              {scanRate.sweepRateHz.toLocaleString()} Hz
            </span>
            <span class="text-[10px] text-muted-foreground">Period: {scanRate.sweepPeriodUs} µs</span>
          </div>
          <div class="flex flex-col rounded-md border bg-muted/20 p-2.5">
            <span class="text-[11px] font-medium text-muted-foreground">Avg Loop Latency</span>
            <span class="font-mono text-base font-bold text-sky-400">
              {scanRate.evalAvgUs} µs
            </span>
            <span class="text-[10px] text-muted-foreground">Per evaluation</span>
          </div>
          <div class="flex flex-col rounded-md border bg-muted/20 p-2.5">
            <span class="text-[11px] font-medium text-muted-foreground">Latency Jitter</span>
            <span class="font-mono text-base font-bold text-amber-400">
              {scanRate.evalMinUs} – {scanRate.evalMaxUs} µs
            </span>
            <span class="text-[10px] text-muted-foreground">Min / Max spread</span>
          </div>
        </div>
      {/if}
    </div>
    <div class="flex flex-col gap-2">
      <div class="grid text-sm text-wrap">
        <span class="font-semibold">Firmware Update</span>
        <span class="text-muted-foreground">
          Update the keyboard firmware via USB DFU directly from your browser.
        </span>
      </div>
      <div class="flex items-center gap-2 text-sm">
        <span class="text-muted-foreground">
          Current: {displayVersion(version)}
        </span>
        {#if updateAvailable}
          <Badge>
            Update Available: {displayVersion(HMK_FIRMWARE_MAX_VERSION)}
          </Badge>
        {:else}
          <Badge variant="secondary">Up to date</Badge>
        {/if}
      </div>
      <div>
        <FirmwareUpdateDialog />
      </div>
    </div>
    <div class="flex flex-col gap-2">
      <div class="grid text-sm text-wrap">
        <span class="font-semibold">Restart Keyboard</span>
        <span class="text-muted-foreground">
          The keyboard will disconnect and reconnect. No changes will be made to
          your keyboard settings.
        </span>
      </div>
      <div>
        <Button
          disabled={demo}
          onclick={() => keyboard.reboot()}
          size="sm"
          variant="outline"
        >
          Restart Keyboard
        </Button>
      </div>
    </div>
    <div class="flex flex-col gap-2">
      <div class="grid text-sm text-wrap">
        <span class="font-semibold">Enter Bootloader Mode</span>
        <span class="text-muted-foreground">
          The keyboard will restart and enter bootloader mode if it is supported
          by the firmware. No changes will be made to your keyboard settings.
        </span>
      </div>
      <div>
        <Button
          disabled={demo}
          onclick={() => keyboard.bootloader()}
          size="sm"
          variant="outline"
        >
          Enter Bootloader Mode
        </Button>
      </div>
    </div>
    <div class="flex flex-col gap-2">
      <div class="grid text-sm text-wrap">
        <span class="font-semibold">Factory Reset</span>
        <span class="text-muted-foreground">
          Revert the keyboard to its factory settings defined by the firmware.
          All user data and settings will be lost.
        </span>
      </div>
      <div>
        <Dialog.Root>
          <Dialog.Trigger>
            {#snippet child({ props })}
              <Button
                disabled={demo}
                size="sm"
                variant="destructive"
                {...props}
              >
                Factory Reset
              </Button>
            {/snippet}
          </Dialog.Trigger>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Factory Reset?</Dialog.Title>
              <Dialog.Description>
                Are you sure you want to factory reset your keyboard?
              </Dialog.Description>
            </Dialog.Header>
            <Dialog.Footer>
              <Dialog.Close>
                {#snippet child({ props })}
                  <Button size="sm" variant="outline" {...props}>Cancel</Button>
                {/snippet}
              </Dialog.Close>
              <Dialog.Close onclick={() => profileQuery.factoryReset()}>
                {#snippet child({ props })}
                  <Button size="sm" variant="destructive" {...props}>
                    Factory Reset
                  </Button>
                {/snippet}
              </Dialog.Close>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Root>
      </div>
    </div>
  </FixedScrollArea>
</div>
