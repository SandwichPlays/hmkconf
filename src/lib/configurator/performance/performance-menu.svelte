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
  import DistanceSlider from "$lib/components/distance-slider.svelte"
  import FixedScrollArea from "$lib/components/fixed-scroll-area.svelte"
  import Switch from "$lib/components/switch.svelte"
  import {
    DEFAULT_ACTUATION_POINT,
    DEFAULT_RT_SENSITIVITY,
    type HMK_Actuation,
  } from "$lib/libhmk/actuation"
  import { setToIntervals } from "$lib/utils"
  import { performanceStateContext } from "../context.svelte"
  import { actuationQueryContext } from "../queries/actuation-query.svelte"
  import { calibrationQueryContext } from "../queries/calibration.query.svelte"

  const performanceState = performanceStateContext.get()
  const { keys } = $derived(performanceState)

  const actuationQuery = actuationQueryContext.get()
  const { current: actuationMap } = $derived(actuationQuery.actuationMap)

  const calibrationQuery = calibrationQueryContext.get()
  const { current: calibration } = $derived(calibrationQuery.calibration)

  const { disabled, firstKey, currentActuation, rtEnabled, separatedRT } = $derived.by(
    () => {
      if (keys.size === 0 || !actuationMap) {
        return { disabled: true } as const
      }

      const [firstKey] = keys
      const currentActuation = actuationMap[firstKey]
      return {
        disabled: false,
        firstKey,
        currentActuation,
        rtEnabled: currentActuation.rtDown > 0,
        separatedRT: currentActuation.rtUp > 0,
      } as const
    },
  )

  const currentTravel = $derived.by(() => {
    if (disabled || !calibration?.switchTravel || firstKey === undefined) return 40
    return calibration.switchTravel[firstKey] ?? 40
  })

  const updateTravel = (v: number) => {
    if (disabled || !calibration?.switchTravel) return
    const newSwitchTravel = [...calibration.switchTravel]
    for (const key of keys) {
      newSwitchTravel[key] = v
    }
    calibrationQuery.set({
      data: {
        ...calibration,
        switchTravel: newSwitchTravel,
      }
    })
  }

  const updateActuation = (f: (actuation: HMK_Actuation) => HMK_Actuation) =>
    !disabled &&
    setToIntervals(keys).map(([offset, len]) =>
      actuationQuery.set({
        offset,
        data: Array(len).fill(f(currentActuation)),
      }),
    )
</script>

<div class="grid size-full grid-cols-[minmax(0,1fr)_24rem]">
  <FixedScrollArea class="flex flex-col gap-4 p-4">
    <CommitSlider
      bind:committed={
        () => currentTravel,
        (v) => updateTravel(v)
      }
      display={(v) => `${(v / 10).toFixed(1)}mm`}
      min={10}
      max={40}
      step={1}
      disabled={disabled || !calibration}
      title="Switch Travel Depth"
      description="Set the physical travel depth of the switch"
    />
    <DistanceSlider
      bind:committed={
        () => currentActuation?.actuationPoint ?? DEFAULT_ACTUATION_POINT,
        (v) =>
          updateActuation((actuation) => ({ ...actuation, actuationPoint: v }))
      }
      keyIndex={firstKey}
      calibration={calibration}
      description="Set the point at which a key press and release is registered."
      {disabled}
      title="Actuation Point"
    />
    <DistanceSlider
      bind:committed={
        () => currentActuation?.rtDown ?? DEFAULT_RT_SENSITIVITY,
        (v) =>
          updateActuation((actuation) => ({
            ...actuation,
            rtDown: v,
            rtUp: separatedRT && actuation.rtUp > 0 && actuation.rtUp < v ? v : actuation.rtUp,
          }))
      }
      keyIndex={firstKey}
      calibration={calibration}
      description={separatedRT
        ? "Set the distance for Rapid Trigger to register a key press."
        : "Set the distance for Rapid Trigger to register a key press or release."}
      disabled={disabled || !rtEnabled}
      title={separatedRT
        ? "Rapid Trigger Press Sensitivity"
        : "Rapid Trigger Sensitivity"}
    />
    {#if separatedRT}
      <DistanceSlider
        bind:committed={
          () => Math.max(currentActuation?.rtUp ?? DEFAULT_RT_SENSITIVITY, currentActuation?.rtDown ?? 0),
          (v) =>
            updateActuation((actuation) => ({
              ...actuation,
              rtUp: Math.max(v, actuation.rtDown),
            }))
        }
        min={currentActuation?.rtDown}
        keyIndex={firstKey}
        calibration={calibration}
        description="Set the distance for Rapid Trigger to register a key release."
        disabled={disabled || !rtEnabled}
        title="Rapid Trigger Release Sensitivity"
      />
    {/if}
  </FixedScrollArea>
  <FixedScrollArea class="flex flex-col gap-4 p-4">
    <Switch
      bind:checked={
        () => rtEnabled ?? false,
        (v) =>
          updateActuation((actuation) => ({
            ...actuation,
            rtDown: v ? DEFAULT_RT_SENSITIVITY : 0,
            rtUp: 0,
            continuous: false,
          }))
      }
      description="Rapid Trigger registers key presses and releases based on changes in key distance rather than absolute position. It activates and deactivates at the actuation point."
      {disabled}
      id="rapid-trigger"
      title="Enable Rapid Trigger"
    />

    <Switch
      bind:checked={
        () => separatedRT ?? false,
        (v) =>
          updateActuation((actuation) => ({
            ...actuation,
            rtUp: v ? DEFAULT_RT_SENSITIVITY : 0,
          }))
      }
      description="Configure Rapid Trigger sensitivity for key presses and releases independently."
      disabled={disabled || !rtEnabled}
      id="separate-rt"
      title="Separate Press/Release Sensitivity"
    />
    <Switch
      bind:checked={
        () => currentActuation?.continuous ?? false,
        (v) =>
          updateActuation((actuation) => ({
            ...actuation,
            continuous: v,
          }))
      }
      description="Deactivates Rapid Trigger only when the key is fully released, instead of at the actuation point."
      disabled={disabled || !rtEnabled}
      id="continuous-rapid-trigger"
      title="Continuous Rapid Trigger"
    />
  </FixedScrollArea>
</div>
