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
  import {
    AlertTriangleIcon,
    CheckCircleIcon,
    LoaderIcon,
    UploadIcon,
    UsbIcon,
  } from "@lucide/svelte"
  import { Button } from "$lib/components/ui/button"
  import * as Dialog from "$lib/components/ui/dialog"
  import { isWebUSBSupported } from "$lib/dfu/dfu-connect"
  import { DFUFlashManager, type DFUFlashStep } from "$lib/dfu/dfu-state.svelte"
  import { firmwareUpdateState } from "$lib/dfu/firmware-update-state.svelte"
  import { keyboardContext } from "$lib/keyboard"

  const keyboard = keyboardContext.get()
  const { demo } = keyboard

  let open = $state(false)
  const manager = new DFUFlashManager()
  const { step } = $derived(manager)

  let fileInput: HTMLInputElement | undefined = $state()

  const canClose = $derived(
    step.type === "idle" ||
      step.type === "complete" ||
      step.type === "error" ||
      step.type === "waiting-for-dfu" ||
      step.type === "connected",
  )

  function handleClose() {
    if (!canClose) return
    open = false
    manager.reset()
    firmwareUpdateState.inProgress = false
  }

  function startUpdate() {
    firmwareUpdateState.inProgress = true
    manager.enterBootloader(keyboard)
  }

  async function handleFileSelect() {
    const file = fileInput?.files?.[0]
    if (!file) return
    const firmware = await file.arrayBuffer()
    await manager.flash(firmware)
  }

  function getStepTitle(step: DFUFlashStep): string {
    switch (step.type) {
      case "idle":
        return "Update Firmware"
      case "entering-bootloader":
        return "Entering Bootloader..."
      case "waiting-for-dfu":
        return "Connect DFU Device"
      case "connected":
        return "Select Firmware"
      case "flashing":
        return "Flashing Firmware..."
      case "complete":
        return "Update Complete"
      case "error":
        return "Update Failed"
    }
  }
</script>

<Dialog.Root
  bind:open
  onOpenChange={(v) => {
    if (!v) handleClose()
  }}
>
  <Dialog.Trigger>
    {#snippet child({ props })}
      <Button
        disabled={demo || !isWebUSBSupported()}
        size="sm"
        variant="outline"
        {...props}
      >
        Update Firmware
      </Button>
    {/snippet}
  </Dialog.Trigger>
  <Dialog.Content
    onInteractOutside={(e) => {
      if (!canClose) e.preventDefault()
    }}
    onEscapeKeydown={(e) => {
      if (!canClose) e.preventDefault()
    }}
  >
    <Dialog.Header>
      <Dialog.Title>{getStepTitle(step)}</Dialog.Title>
    </Dialog.Header>

    {#if step.type === "idle"}
      <div class="flex flex-col gap-4">
        <Dialog.Description>
          This will update your keyboard's firmware. The keyboard will restart into bootloader mode, then the new firmware will be written via USB.
        </Dialog.Description>
        <div
          class="flex items-start gap-3 rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm"
        >
          <AlertTriangleIcon class="mt-0.5 size-4 shrink-0 text-yellow-500" />
          <span>
            Do not disconnect the keyboard during the update. If something goes wrong, hold the DFU button on the keyboard while plugging it in to enter recovery mode.
          </span>
        </div>
      </div>
      <Dialog.Footer>
        <Dialog.Close>
          {#snippet child({ props })}
            <Button size="sm" variant="outline" {...props}>Cancel</Button>
          {/snippet}
        </Dialog.Close>
        <Button size="sm" onclick={startUpdate}>
          Start Update
        </Button>
      </Dialog.Footer>
    {:else if step.type === "entering-bootloader"}
      <div class="flex flex-col items-center gap-4 py-6">
        <LoaderIcon class="size-8 animate-spin text-muted-foreground" />
        <p class="text-sm text-muted-foreground">
          Restarting keyboard into bootloader mode...
        </p>
      </div>
    {:else if step.type === "waiting-for-dfu"}
      <div class="flex flex-col gap-4">
        <Dialog.Description>
          The keyboard has been restarted in bootloader mode. Click the button below to connect to the DFU device.
        </Dialog.Description>
        <div
          class="flex items-start gap-3 rounded-md border border-blue-500/50 bg-blue-500/10 p-3 text-sm"
        >
          <UsbIcon class="mt-0.5 size-4 shrink-0 text-blue-500" />
          <span>
            Windows users: If the DFU device does not appear, you may need to install the WinUSB driver using Zadig. Select the DFU device and install the WinUSB driver.
          </span>
        </div>
      </div>
      <Dialog.Footer>
        <Button size="sm" variant="outline" onclick={() => handleClose()}>
          Cancel
        </Button>
        <Button size="sm" onclick={() => manager.connectDFU()}>
          <UsbIcon class="size-4" />
          Connect DFU Device
        </Button>
      </Dialog.Footer>
    {:else if step.type === "connected"}
      <div class="flex flex-col gap-4">
        <Dialog.Description>
          DFU device connected. Select a firmware file (.bin) to flash.
        </Dialog.Description>
        <input
          bind:this={fileInput}
          accept=".bin"
          class="hidden"
          onchange={handleFileSelect}
          type="file"
        />
      </div>
      <Dialog.Footer>
        <Button size="sm" variant="outline" onclick={() => handleClose()}>
          Cancel
        </Button>
        <Button size="sm" onclick={() => fileInput?.click()}>
          <UploadIcon class="size-4" />
          Select Firmware File
        </Button>
      </Dialog.Footer>
    {:else if step.type === "flashing"}
      <div class="flex flex-col gap-4 py-4">
        <Dialog.Description>
          Writing firmware to device... Do not disconnect the keyboard.
        </Dialog.Description>
        <div class="flex flex-col gap-2">
          <div class="h-3 w-full overflow-hidden rounded-full bg-secondary">
            <div
              class="h-full rounded-full bg-primary transition-all duration-300"
              style="width: {Math.round(step.progress * 100)}%"
            ></div>
          </div>
          <p class="text-center text-sm text-muted-foreground">
            {Math.round(step.progress * 100)}%
          </p>
        </div>
      </div>
    {:else if step.type === "complete"}
      <div class="flex flex-col items-center gap-4 py-6">
        <CheckCircleIcon class="size-8 text-green-500" />
        <p class="text-sm text-muted-foreground">
          Firmware has been updated successfully. The keyboard will restart automatically.
        </p>
      </div>
      <Dialog.Footer>
        <Button size="sm" onclick={() => handleClose()}>Done</Button>
      </Dialog.Footer>
    {:else if step.type === "error"}
      <div class="flex flex-col gap-4">
        <div
          class="flex items-start gap-3 rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm"
        >
          <AlertTriangleIcon class="mt-0.5 size-4 shrink-0 text-red-500" />
          <span>{step.message}</span>
        </div>
        <p class="text-sm text-muted-foreground">
          If the keyboard is unresponsive, hold the DFU button while plugging it in to enter recovery mode, then try again.
        </p>
      </div>
      <Dialog.Footer>
        <Button size="sm" variant="outline" onclick={() => handleClose()}>
          Close
        </Button>
        <Button size="sm" onclick={() => manager.reset()}>Try Again</Button>
      </Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>
