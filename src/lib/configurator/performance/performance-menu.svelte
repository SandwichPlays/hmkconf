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
  import RangeDistanceSlider from "$lib/components/range-distance-slider.svelte"
  import Switch from "$lib/components/switch.svelte"
  import VerticalCommitSlider from "$lib/components/vertical-commit-slider.svelte"
  import VerticalDistanceSlider from "$lib/components/vertical-distance-slider.svelte"
  import { distanceToMM, mmToDistance } from "$lib/distance"
  import {
    DEFAULT_ACTUATION_POINT,
    DEFAULT_RT_SENSITIVITY,
    DEFAULT_RT_DEADZONE,
    DEFAULT_ACTUATION_POINT_MM,
    DEFAULT_RT_SENSITIVITY_MM,
    DEFAULT_RT_DEADZONE_MM,
    type HMK_Actuation,
  } from "$lib/libhmk/actuation"
  import { setToIntervals } from "$lib/utils"
  import { performanceStateContext, persistedStateContext } from "../context.svelte"
  import { actuationQueryContext } from "../queries/actuation-query.svelte"
  import { calibrationQueryContext } from "../queries/calibration.query.svelte"

  const performanceState = performanceStateContext.get()
  const { keys } = $derived(performanceState)

  const actuationQuery = actuationQueryContext.get()
  const { current: actuationMap } = $derived(actuationQuery.actuationMap)

  const calibrationQuery = calibrationQueryContext.get()
  const { current: calibration } = $derived(calibrationQuery.calibration)

  const persistedState = persistedStateContext.get()

  const isTravelLocked = $derived.by(() => {
    if (disabled || keys.size === 0 || !calibration?.switchTravel) return false
    for (const key of keys) {
      const storedType = persistedState?.current?.switchTypes?.[String(key)]
      if (storedType === "custom") {
        continue
      }
      if (storedType === "yingying-dual-lights-max" || storedType === "linear-he-default") {
        return true
      }
      const deciMM = calibration.switchTravel[key] ?? 36
      if (deciMM === 36 || deciMM === 40) {
        return true
      }
    }
    return false
  })

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
    const newTravelMM = v / 10
    const newSwitchTravel = [...calibration.switchTravel]
    for (const key of keys) {
      newSwitchTravel[key] = v
    }
    const newCalibration = {
      ...calibration,
      switchTravel: newSwitchTravel,
    }

    const map = actuationMap ?? []
    const updates = setToIntervals(keys).map(([offset, len]) => {
      const data: HMK_Actuation[] = []
      for (let i = 0; i < len; i++) {
        const key = offset + i
        const curAct = map[key] ?? currentActuation
        const oldTravelMM = (calibration.switchTravel?.[key] ?? 40) / 10
        if (oldTravelMM === newTravelMM) {
          data.push(curAct)
          continue
        }
        const maxTravelUM = Math.round(newTravelMM * 1000)
        data.push({
          ...curAct,
          actuationPoint: Math.max(10, Math.min(maxTravelUM, curAct.actuationPoint)),
          rtDown: curAct.rtDown,
          rtUp: curAct.rtUp,
          rtDeadzoneTop: curAct.rtDeadzoneTop,
          rtDeadzoneBottom: curAct.rtDeadzoneBottom,
        })
      }
      return { offset, data }
    })
    actuationQuery.setMany(updates)

    calibrationQuery.set({
      data: newCalibration,
    })
  }

  const updateActuation = (f: (actuation: HMK_Actuation, key: number) => HMK_Actuation) => {
    if (disabled) return
    const map = actuationMap ?? []
    const updates = setToIntervals(keys).map(([offset, len]) => {
      const data: HMK_Actuation[] = []
      for (let i = 0; i < len; i++) {
        const key = offset + i
        const currentKeyActuation = map[key] ?? currentActuation
        data.push(f(currentKeyActuation, key))
      }
      return { offset, data }
    })
    actuationQuery.setMany(updates)
  }
</script>

<div class="size-full p-4 overflow-y-auto">
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
    <!-- Column 1: Travel & Actuation (Vertical Sliders) -->
    <div class="flex flex-col gap-4 rounded-xl border p-5 bg-card/60 shadow-2xs h-full">
      <h3 class="font-semibold text-lg border-b pb-2">Travel & Actuation</h3>
      <div class="grid grid-cols-2 gap-3 flex-1">
        <VerticalCommitSlider
          bind:committed={
            () => currentTravel / 10,
            (v) => updateTravel(Math.round(v * 10))
          }
          display={(v) => `${v.toFixed(1)}mm`}
          min={1.0}
          max={4.0}
          step={0.1}
          disabled={disabled || !calibration}
          locked={isTravelLocked}
          title="Travel Depth"
          description="Physical switch travel depth"
        />
        <VerticalDistanceSlider
          bind:committed={
            () => currentActuation?.actuationPoint ?? DEFAULT_ACTUATION_POINT,
            (v) => {
              const actPointMM = distanceToMM(v, firstKey, calibration)
              updateActuation((actuation, key) => ({
                ...actuation,
                actuationPoint: mmToDistance(actPointMM, key, calibration),
              }))
            }
          }
          keyIndex={firstKey}
          calibration={calibration}
          description="Set point to activate keypress"
          {disabled}
          min={0.01}
          title="Actuation Point"
        />
      </div>
    </div>

    <!-- Column 2: Rapid Trigger Section Card -->
    <div class="flex flex-col gap-4 rounded-xl border p-5 bg-card/60 shadow-2xs h-full">
      <h3 class="font-semibold text-lg border-b pb-2">Rapid Trigger</h3>
      
      <div class="flex flex-col gap-4">
        <Switch
          bind:checked={
            () => rtEnabled ?? false,
            (v) =>
              updateActuation((actuation, key) => {
                const sensDist = mmToDistance(DEFAULT_RT_SENSITIVITY_MM, key, calibration)
                const dzDist = mmToDistance(DEFAULT_RT_DEADZONE_MM, key, calibration)
                return {
                  ...actuation,
                  rtDown: v ? (actuation.rtDown || sensDist) : 0,
                  rtUp: 0,
                  continuous: false,
                  rtDeadzoneTop: v ? (actuation.rtDeadzoneTop || dzDist) : actuation.rtDeadzoneTop,
                  rtDeadzoneBottom: v ? (actuation.rtDeadzoneBottom || dzDist) : actuation.rtDeadzoneBottom,
                }
              })
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
              updateActuation((actuation, key) => ({
                ...actuation,
                rtUp: v ? (actuation.rtDown || mmToDistance(DEFAULT_RT_SENSITIVITY_MM, key, calibration)) : 0,
              }))
          }
          description="Configure RT Press and Release sensitivity independently."
          disabled={disabled || !rtEnabled}
          id="separate-rt"
          title="Split sensitivity"
        />
      </div>

      {#if rtEnabled}
        <div class="flex flex-col gap-4 mt-2 pt-2 border-t">
          {#if separatedRT}
            <!-- Independent Press Sensitivity Slider -->
            <DistanceSlider
              bind:committed={
                () => currentActuation?.rtDown ?? DEFAULT_RT_SENSITIVITY,
                (v) => {
                  const sensMM = distanceToMM(v, firstKey, calibration)
                  updateActuation((actuation, key) => ({
                    ...actuation,
                    rtDown: mmToDistance(sensMM, key, calibration),
                  }))
                }
              }
              keyIndex={firstKey}
              calibration={calibration}
              description="Distance to register key press."
              disabled={disabled || !rtEnabled}
              title="Press Sensitivity"
            />
            <!-- Independent Release Sensitivity Slider -->
            <DistanceSlider
              bind:committed={
                () => currentActuation?.rtUp ?? DEFAULT_RT_SENSITIVITY,
                (v) => {
                  const sensMM = distanceToMM(v, firstKey, calibration)
                  updateActuation((actuation, key) => ({
                    ...actuation,
                    rtUp: mmToDistance(sensMM, key, calibration),
                  }))
                }
              }
              keyIndex={firstKey}
              calibration={calibration}
              description="Distance to register key release."
              disabled={disabled || !rtEnabled}
              title="Release Sensitivity"
            />
          {:else}
            <!-- Single Rapid Trigger Sensitivity Slider -->
            <DistanceSlider
              bind:committed={
                () => currentActuation?.rtDown ?? DEFAULT_RT_SENSITIVITY,
                (v) => {
                  const sensMM = distanceToMM(v, firstKey, calibration)
                  updateActuation((actuation, key) => ({
                    ...actuation,
                    rtDown: mmToDistance(sensMM, key, calibration),
                  }))
                }
              }
              keyIndex={firstKey}
              calibration={calibration}
              description="Distance to register key press or release."
              disabled={disabled || !rtEnabled}
              title="Sensitivity"
            />
          {/if}
        </div>
      {/if}
    </div>

    <!-- Column 3: Continuous RT & Deadzones Section Card -->
    <div class="flex flex-col gap-4 rounded-xl border p-5 bg-card/60 shadow-2xs h-full">
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
          description="Bypasses actuation point across full travel."
          disabled={disabled || !rtEnabled}
          id="continuous-rapid-trigger"
          title="Continuous Rapid Trigger"
        />

        <!-- Enable RT Deadzone Switch (Directly Under Continuous RT) -->
        <Switch
          bind:checked={
            () => deadzoneEnabled ?? false,
            (v) =>
              updateActuation((actuation, key) => {
                const dzDist = mmToDistance(DEFAULT_RT_DEADZONE_MM, key, calibration)
                return {
                  ...actuation,
                  rtDeadzoneTop: v ? dzDist : 0,
                  rtDeadzoneBottom: v ? dzDist : 0,
                }
              })
          }
          description="Enables RT top & bottom deadzones"
          disabled={disabled || !rtEnabled}
          id="rt-deadzone"
          title="Enable RT Deadzone"
        />
      </div>

      {#if rtEnabled && deadzoneEnabled}
        <div class="flex flex-col gap-4 mt-2 pt-2 border-t">
          <RangeDistanceSlider
            bind:committed={
              () => [
                currentActuation?.rtDeadzoneTop ?? 0,
                currentActuation?.rtDeadzoneBottom ?? 0,
              ],
              (v) => {
                const topMM = distanceToMM(v[0], firstKey, calibration)
                const botMM = distanceToMM(v[1], firstKey, calibration)
                updateActuation((actuation, key) => ({
                  ...actuation,
                  rtDeadzoneTop: mmToDistance(topMM, key, calibration),
                  rtDeadzoneBottom: mmToDistance(botMM, key, calibration),
                }))
              }
            }
            mode="deadzone"
            keyIndex={firstKey}
            calibration={calibration}
            description="Set top (left) and bottom (right) RT deadzones."
            disabled={disabled || !rtEnabled}
            title="RT Deadzones"
          />
        </div>
      {/if}
    </div>
  </div>
</div>
