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
  import DistanceSlider from "$lib/components/distance-slider.svelte"
  import FixedScrollArea from "$lib/components/fixed-scroll-area.svelte"
  import Switch from "$lib/components/switch.svelte"
  import VerticalCommitSlider from "$lib/components/vertical-commit-slider.svelte"
  import VerticalDistanceSlider from "$lib/components/vertical-distance-slider.svelte"
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

  const { disabled, firstKey, currentActuation, rtEnabled, separatedRT, deadzoneEnabled } = $derived.by(
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
        deadzoneEnabled:
          (currentActuation.rtDeadzoneTop ?? 0) > 0 ||
          (currentActuation.rtDeadzoneBottom ?? 0) > 0,
      } as const
    },
  )

  const currentTravel = $derived.by(() => {
    if (disabled || !calibration?.switchTravel || firstKey === undefined) return 40
    return calibration.switchTravel[firstKey] ?? 40
  })

  const updateTravel = (v: number) => {
    if (disabled || !calibration?.switchTravel || firstKey === undefined) return
    const oldTravelMM = (calibration.switchTravel[firstKey] ?? 40) / 10
    const newTravelMM = v / 10
    if (oldTravelMM === newTravelMM) return

    const newSwitchTravel = [...calibration.switchTravel]
    for (const key of keys) {
      newSwitchTravel[key] = v
    }
    const newCalibration = {
      ...calibration,
      switchTravel: newSwitchTravel,
    }

    if (currentActuation) {
      const actPointMM = (currentActuation.actuationPoint / 10000) * oldTravelMM
      const rtDownMM = currentActuation.rtDown > 0 ? (currentActuation.rtDown / 10000) * oldTravelMM : 0
      const rtUpMM = currentActuation.rtUp > 0 ? (currentActuation.rtUp / 10000) * oldTravelMM : 0
      const topMM = (currentActuation.rtDeadzoneTop ?? 0) > 0 ? ((currentActuation.rtDeadzoneTop ?? 0) / 10000) * oldTravelMM : 0
      const botMM = (currentActuation.rtDeadzoneBottom ?? 0) > 0 ? ((currentActuation.rtDeadzoneBottom ?? 0) / 10000) * oldTravelMM : 0

      const updatedActuation: HMK_Actuation = {
        ...currentActuation,
        actuationPoint: Math.max(0, Math.min(10000, Math.round((Math.min(actPointMM, newTravelMM) / newTravelMM) * 10000))),
        rtDown: rtDownMM > 0 ? Math.max(0, Math.min(10000, Math.round((Math.min(rtDownMM, newTravelMM) / newTravelMM) * 10000))) : 0,
        rtUp: rtUpMM > 0 ? Math.max(0, Math.min(10000, Math.round((Math.min(rtUpMM, newTravelMM) / newTravelMM) * 10000))) : 0,
        rtDeadzoneTop: topMM > 0 ? Math.max(0, Math.min(10000, Math.round((Math.min(topMM, newTravelMM) / newTravelMM) * 10000))) : 0,
        rtDeadzoneBottom: botMM > 0 ? Math.max(0, Math.min(10000, Math.round((Math.min(botMM, newTravelMM) / newTravelMM) * 10000))) : 0,
      }

      setToIntervals(keys).map(([offset, len]) =>
        actuationQuery.set({
          offset,
          data: Array(len).fill(updatedActuation),
        }),
      )
    }

    calibrationQuery.set({
      data: newCalibration,
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

<div class="grid size-full grid-cols-[16rem_1fr]">
  <!-- Left Column: Vertical Sliders (Travel Depth -> Actuation Point) -->
  <div class="flex gap-3 p-4 border-r overflow-y-auto">
    <VerticalCommitSlider
      bind:committed={
        () => currentTravel,
        (v) => updateTravel(v)
      }
      display={(v) => `${(v / 10).toFixed(1)}mm`}
      min={10}
      max={40}
      step={1}
      disabled={disabled || !calibration}
      title="Travel Depth"
      description="Physical switch travel depth"
    />
    <VerticalDistanceSlider
      bind:committed={
        () => currentActuation?.actuationPoint ?? DEFAULT_ACTUATION_POINT,
        (v) =>
          updateActuation((actuation) => ({ ...actuation, actuationPoint: v }))
      }
      keyIndex={firstKey}
      calibration={calibration}
      description="Key press actuation registration point"
      {disabled}
      title="Actuation Point"
    />
  </div>

  <!-- Right Section: Rapid Trigger & Continuous/Deadzone Cards -->
  <FixedScrollArea class="flex flex-col gap-6 p-6">
    <!-- Rapid Trigger Section Card -->
    <div class="flex flex-col gap-4 rounded-xl border p-5 bg-card/60 shadow-2xs">
      <h3 class="font-semibold text-lg border-b pb-2">Rapid Trigger</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          description="Activates keys dynamically on travel movement."
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
                rtUp: v ? (actuation.rtDown || DEFAULT_RT_SENSITIVITY) : 0,
              }))
          }
          description="Configure Press and Release sensitivity independently."
          disabled={disabled || !rtEnabled}
          id="separate-rt"
          title="Separate Press/Release"
        />
      </div>

      {#if rtEnabled}
        <div class="flex flex-col gap-4 mt-2 pt-2 border-t">
          {#if separatedRT}
            <!-- Independent Press Sensitivity Slider -->
            <DistanceSlider
              bind:committed={
                () => currentActuation?.rtDown ?? DEFAULT_RT_SENSITIVITY,
                (v) => updateActuation((actuation) => ({ ...actuation, rtDown: v }))
              }
              keyIndex={firstKey}
              calibration={calibration}
              description="Distance to register key press."
              disabled={disabled || !rtEnabled}
              title="Rapid Trigger Press Sensitivity"
            />
            <!-- Independent Release Sensitivity Slider -->
            <DistanceSlider
              bind:committed={
                () => currentActuation?.rtUp ?? DEFAULT_RT_SENSITIVITY,
                (v) => updateActuation((actuation) => ({ ...actuation, rtUp: v }))
              }
              keyIndex={firstKey}
              calibration={calibration}
              description="Distance to register key release."
              disabled={disabled || !rtEnabled}
              title="Rapid Trigger Release Sensitivity"
            />
          {:else}
            <!-- Single Rapid Trigger Sensitivity Slider -->
            <DistanceSlider
              bind:committed={
                () => currentActuation?.rtDown ?? DEFAULT_RT_SENSITIVITY,
                (v) => updateActuation((actuation) => ({ ...actuation, rtDown: v }))
              }
              keyIndex={firstKey}
              calibration={calibration}
              description="Distance to register key press or release."
              disabled={disabled || !rtEnabled}
              title="Rapid Trigger Sensitivity"
            />
          {/if}
        </div>
      {/if}
    </div>

    <!-- Continuous RT & Deadzones Section Card (Dedicated Separate Area) -->
    <div class="flex flex-col gap-4 rounded-xl border p-5 bg-card/60 shadow-2xs">
      <h3 class="font-semibold text-lg border-b pb-2">Continuous RT & Deadzones</h3>

      <div class="flex flex-col gap-4">
        <!-- Continuous Rapid Trigger Switch -->
        <Switch
          bind:checked={
            () => currentActuation?.continuous ?? false,
            (v) =>
              updateActuation((actuation) => ({
                ...actuation,
                continuous: v,
              }))
          }
          description="Bypasses actuation point and keeps RT active across full travel."
          disabled={disabled || !rtEnabled}
          id="continuous-rapid-trigger"
          title="Continuous Rapid Trigger"
        />

        <!-- Enable RT Deadzone Switch (Directly Under Continuous RT) -->
        <Switch
          bind:checked={
            () => deadzoneEnabled ?? false,
            (v) =>
              updateActuation((actuation) => ({
                ...actuation,
                rtDeadzoneTop: v ? 200 : 0,
                rtDeadzoneBottom: v ? 200 : 0,
              }))
          }
          description="Eliminates chatter near rest and bottom-out positions."
          disabled={disabled || !rtEnabled}
          id="rt-deadzone"
          title="Enable RT Deadzone"
        />
      </div>

      {#if rtEnabled && deadzoneEnabled}
        <div class="flex flex-col gap-4 mt-2 pt-2 border-t">
          <DistanceSlider
            bind:committed={
              () => currentActuation?.rtDeadzoneTop ?? 200,
              (v) => updateActuation((actuation) => ({ ...actuation, rtDeadzoneTop: v }))
            }
            keyIndex={firstKey}
            calibration={calibration}
            description="Inactive deadzone distance near rest position."
            disabled={disabled || !rtEnabled}
            title="Top RT Deadzone"
          />
          <DistanceSlider
            bind:committed={
              () => currentActuation?.rtDeadzoneBottom ?? 200,
              (v) => updateActuation((actuation) => ({ ...actuation, rtDeadzoneBottom: v }))
            }
            keyIndex={firstKey}
            calibration={calibration}
            description="Forces key pressed distance near bottom-out position."
            disabled={disabled || !rtEnabled}
            title="Bottom RT Deadzone"
          />
        </div>
      {/if}
    </div>
  </FixedScrollArea>
</div>
