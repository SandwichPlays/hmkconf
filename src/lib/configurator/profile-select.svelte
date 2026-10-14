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
  import { KeyboardIcon } from "@lucide/svelte"
  import * as Select from "$lib/components/ui/select"
  import * as Tooltip from "$lib/components/ui/tooltip"
  import { keyboardContext } from "$lib/keyboard"
  import { globalStateContext, persistedStateContext } from "./context.svelte"
  import { profileQueryContext } from "./queries/profile-query.svelte"

  const globalState = globalStateContext.get()
  const { profile } = $derived(globalState)
  const { numProfiles } = keyboardContext.get().metadata

  const profileQuery = profileQueryContext.get()
  const { current: keyboardProfile } = $derived(
    profileQuery.profile,
  )

  const persistedState = persistedStateContext.get()
  const profileNames = $derived(persistedState.current.profileNames ?? [])

  function activateProfile(index: number) {
    globalState.setProfile(index)
    profileQuery.setProfile({ profile: index })
  }
</script>

<Select.Root
  bind:value={() => String(profile), (v) => activateProfile(Number(v))}
  type="single"
>
  <Select.Trigger class="w-52" size="sm">
    <span class="flex items-center gap-2 truncate">
      <span class="truncate">
        {profileNames[profile] || `Profile ${profile}`}
      </span>
      {#if keyboardProfile === profile}
        <KeyboardIcon class="shrink-0" />
      {/if}
    </span>
  </Select.Trigger>
  <Select.Content class="w-[var(--bits-select-anchor-width)]">
    {#each { length: numProfiles }, i (i)}
      <Select.Item
        value={String(i)}
        onclick={() => activateProfile(i)}
      >
        <span class="flex items-center gap-2">
          {#if profileNames[i]}
            <span class="font-medium truncate">{profileNames[i]}</span>
            <span class="text-xs text-muted-foreground shrink-0 font-normal">P{i}</span>
          {:else}
            Profile {i}
          {/if}
          {#if keyboardProfile === i}
            <Tooltip.Root>
              <Tooltip.Trigger>
                <KeyboardIcon />
                <span class="sr-only">Active</span>
              </Tooltip.Trigger>
              <Tooltip.Content>Current Active Profile</Tooltip.Content>
            </Tooltip.Root>
          {/if}
        </span>
      </Select.Item>
    {/each}
  </Select.Content>
</Select.Root>
