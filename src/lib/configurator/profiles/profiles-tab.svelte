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
  import { EllipsisVerticalIcon, PencilIcon } from "@lucide/svelte"
  import FixedScrollArea from "$lib/components/fixed-scroll-area.svelte"
  import { Badge } from "$lib/components/ui/badge"
  import { Button } from "$lib/components/ui/button"
  import * as Dialog from "$lib/components/ui/dialog"
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu"
  import { Input } from "$lib/components/ui/input"
  import { keyboardContext } from "$lib/keyboard"
  import { cn, type WithoutChildren } from "$lib/utils"
  import { toast } from "svelte-sonner"
  import type { HTMLAttributes } from "svelte/elements"
  import z from "zod"
  import {
    globalStateContext,
    persistedStateContext,
  } from "../context.svelte"
  import { KeyboardConfig } from "../lib/keyboard-config.svelte"
  import { profileQueryContext } from "../queries/profile-query.svelte"

  const {
    class: className,
    ...props
  }: WithoutChildren<HTMLAttributes<HTMLDivElement>> = $props()

  const { name, numProfiles } = keyboardContext.get().metadata

  const globalState = globalStateContext.get()
  const profileQuery = profileQueryContext.get()
  const { current: currentProfile } = $derived(profileQuery.profile)
  const keyboardConfig = new KeyboardConfig()

  const persistedState = persistedStateContext.get()
  const profileNames = $derived(persistedState.current.profileNames ?? [])

  let fileRef: HTMLInputElement | null = $state(null)
  let anchorRef: HTMLAnchorElement | null = $state(null)

  let renameDialogOpen = $state(false)
  let renameTarget: number | null = $state(null)
  let renameValue = $state("")

  function activateProfile(profile: number) {
    globalState.setProfile(profile)
    profileQuery.setProfile({ profile })
    const displayName = profileNames[profile] || `Profile ${profile}`
    toast.success(`${displayName} activated.`)
  }

  function startRename(profile: number) {
    renameTarget = profile
    renameValue = profileNames[profile] || ""
    renameDialogOpen = true
  }

  function saveRename() {
    if (renameTarget === null) return
    if (!persistedState.current.profileNames) {
      persistedState.current.profileNames = Array(numProfiles).fill("")
    }
    const trimmed = renameValue.trim()
    persistedState.current.profileNames[renameTarget] = trimmed
    toast.success(
      trimmed
        ? `Renamed Profile ${renameTarget} to "${trimmed}".`
        : `Reset Profile ${renameTarget} name to default.`,
    )
    renameDialogOpen = false
  }

  const importProfile = async (profile: number) => {
    if (!fileRef) return
    fileRef.onchange = null
    fileRef.value = ""
    fileRef.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const json = JSON.parse(text)
        await keyboardConfig.setConfig(profile, json)
        if (json.name && typeof json.name === "string" && json.name.trim()) {
          if (!persistedState.current.profileNames) {
            persistedState.current.profileNames = Array(numProfiles).fill("")
          }
          persistedState.current.profileNames[profile] = json.name.trim()
        }
        toast.success(`Successfully imported Profile ${profile}.`)
      } catch (err) {
        if (err instanceof SyntaxError) {
          toast.error("The selected file is not a valid JSON.")
        } else if (err instanceof z.ZodError) {
          toast.error(
            "The selected file is not a valid keyboard metadata. See console for details.",
          )
          console.error(z.treeifyError(err))
        } else {
          toast.error(String(err))
        }
      }
    }
    fileRef.click()
  }

  const exportProfile = async (profile: number) => {
    if (!anchorRef) return
    try {
      const config = await keyboardConfig.getConfig(profile)
      const pName = profileNames[profile]?.trim()
      const exportData = {
        ...config,
        ...(pName ? { name: pName } : {}),
      }
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      })
      const sanitized = pName
        ? pName.replace(/[^a-zA-Z0-9_-]/g, "_")
        : `profile-${profile}`
      anchorRef.href = URL.createObjectURL(blob)
      anchorRef.download = `${name}-${sanitized}.json`
      toast.success(`Successfully exported Profile ${profile}.`)
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(
          "Unexpected keyboard configuration schema error. See console for details.",
        )
        console.error(z.treeifyError(err))
      } else {
        toast.error(String(err))
      }
    }
    anchorRef.click()
  }
</script>

<div
  class={cn(
    "mx-auto flex size-full max-w-3xl flex-col outline-none focus:outline-none focus-visible:outline-none",
    className,
  )}
  {...props}
>
  <FixedScrollArea class="flex flex-col gap-4 p-4">
    <div class="grid shrink-0">
      <span class="font-semibold">Configure Profiles</span>
      <span class="text-sm text-muted-foreground">
        Manage your keyboard profiles here. Click any profile to activate it on your keyboard.
      </span>
    </div>
    <div class="grid grid-cols-2 gap-4">
      {#each { length: numProfiles }, profile (profile)}
        <div
          role="button"
          tabindex="0"
          onclick={() => activateProfile(profile)}
          onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              activateProfile(profile)
            }
          }}
          class={cn(
            "group relative flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-4 shadow-sm transition-all outline-none",
            profile === currentProfile
              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
              : "bg-card hover:border-foreground/40 hover:bg-muted/40",
          )}
        >
          <div class="grid flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="truncate font-semibold text-base">
                {profileNames[profile] || `Profile ${profile}`}
              </span>
              {#if profileNames[profile]}
                <span class="text-xs text-muted-foreground shrink-0 font-normal">
                  (P{profile})
                </span>
              {/if}
              <Button
                size="icon"
                variant="ghost"
                class="size-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                title="Rename profile"
                onclick={(e) => {
                  e.stopPropagation()
                  startRename(profile)
                }}
              >
                <PencilIcon class="size-3.5" />
                <span class="sr-only">Rename</span>
              </Button>
            </div>
            <span class="text-xs text-muted-foreground truncate">
              {profile === currentProfile ? "Active profile on keyboard" : "Click to activate"}
            </span>
          </div>

          <div
            class="flex shrink-0 items-center gap-2"
            onclick={(e) => e.stopPropagation()}
            onkeydown={(e) => e.stopPropagation()}
            role="presentation"
          >
            {#if profile === currentProfile}
              <Badge>Active</Badge>
            {/if}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                {#snippet child({ props })}
                  <Button size="icon" variant="ghost" {...props}>
                    <EllipsisVerticalIcon />
                    <span class="sr-only">Open Menu</span>
                  </Button>
                {/snippet}
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="start">
                <DropdownMenu.Group>
                  <DropdownMenu.Item onSelect={() => activateProfile(profile)}>
                    Activate
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={() => startRename(profile)}>
                    Rename
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={() => importProfile(profile)}>
                    Import
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={() => exportProfile(profile)}>
                    Export
                  </DropdownMenu.Item>
                  <DropdownMenu.Sub>
                    <DropdownMenu.SubTrigger>
                      Duplicate From
                    </DropdownMenu.SubTrigger>
                    <DropdownMenu.SubContent>
                      {#each { length: numProfiles }, srcProfile (srcProfile)}
                        {#if srcProfile !== profile}
                          <DropdownMenu.Item
                            onSelect={() => {
                              profileQuery.duplicateProfile({
                                profile,
                                srcProfile,
                              })
                              if (persistedState.current.profileNames) {
                                const srcName = persistedState.current.profileNames[srcProfile]
                                persistedState.current.profileNames[profile] = srcName
                                  ? `${srcName} (Copy)`
                                  : ""
                              }
                            }}
                          >
                            {profileNames[srcProfile]
                              ? `${profileNames[srcProfile]} (P${srcProfile})`
                              : `Profile ${srcProfile}`}
                          </DropdownMenu.Item>
                        {/if}
                      {/each}
                    </DropdownMenu.SubContent>
                  </DropdownMenu.Sub>
                  <DropdownMenu.Item
                    onSelect={() => {
                      profileQuery.resetProfile({ profile })
                      if (persistedState.current.profileNames) {
                        persistedState.current.profileNames[profile] = ""
                      }
                    }}
                  >
                    Restore Default
                  </DropdownMenu.Item>
                </DropdownMenu.Group>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </div>
        </div>
      {/each}
    </div>
  </FixedScrollArea>
</div>

<Dialog.Root bind:open={renameDialogOpen}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Rename Profile {renameTarget}</Dialog.Title>
      <Dialog.Description>
        Enter a custom name for this profile, or leave empty to use the default name.
      </Dialog.Description>
    </Dialog.Header>
    <form
      onsubmit={(e) => {
        e.preventDefault()
        saveRename()
      }}
      class="grid gap-4 py-2"
    >
      <Input
        bind:value={renameValue}
        placeholder={`Profile ${renameTarget}`}
        maxlength={24}
        autofocus
      />
      <Dialog.Footer class="gap-2 sm:gap-0">
        <Button
          type="button"
          variant="outline"
          onclick={() => (renameDialogOpen = false)}
        >
          Cancel
        </Button>
        <Button type="submit">
          Save
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

<input
  bind:this={fileRef}
  accept="application/json"
  aria-hidden="true"
  hidden
  type="file"
/>
<a bind:this={anchorRef} aria-hidden="true" hidden href="#0"></a>
