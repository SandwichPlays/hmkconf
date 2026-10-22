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
  import { KeyButton } from "$lib/components/key-button"
  import SwitchGraphic from "$lib/components/switch-graphic.svelte"
  import type { HMK_Calibration } from "$lib/libhmk"
  import type { WithoutChildrenOrChild } from "$lib/utils"
  import type { ComponentProps } from "svelte"
  import { persistedStateContext } from "../context.svelte"
  import { resolveSwitch } from "./switch-definitions"

  const {
    keyIndex,
    calibration,
    label = "",
    ...props
  }: WithoutChildrenOrChild<ComponentProps<typeof KeyButton>> & {
    keyIndex: number
    calibration?: HMK_Calibration
    label?: string
  } = $props()

  const persistedState = persistedStateContext.get()

  const travelDeciMM = $derived(
    calibration?.switchTravel && calibration.switchTravel[keyIndex] !== undefined
      ? calibration.switchTravel[keyIndex]
      : 36,
  )

  const switchType = $derived(persistedState?.current?.switchTypes?.[String(keyIndex)])
  const switchDef = $derived(resolveSwitch(travelDeciMM, switchType))
</script>

<KeyButton
  size="sm"
  class="relative flex flex-col items-center justify-between p-1 overflow-hidden"
  {...props}
>
  <span class="text-[10px] font-medium leading-none opacity-80 self-start truncate max-w-full">
    {label}
  </span>

  <div class="my-auto flex items-center justify-center">
    <SwitchGraphic
      mode="topdown"
      size={20}
      stemColor={switchDef.stemColor}
      housingColor={switchDef.housingColor}
    />
  </div>
</KeyButton>
