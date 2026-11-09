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
  import * as KeyboardEditor from "$lib/components/keyboard-editor"
  import { Button } from "$lib/components/ui/button"
  import { Toggle } from "$lib/components/ui/toggle"
  import { keyboardContext } from "$lib/keyboard"
  import { defaultRGBColor, defaultRGBOptions } from "$lib/libhmk/rgb"
  import { rgbStateContext } from "../context.svelte"
  import { rgbQueryContext } from "../queries/rgb-query.svelte"

  const keyboard = keyboardContext.get()
  const rgbState = rgbStateContext.get()
  const rgbQuery = rgbQueryContext.get()

  const { leds } = $derived(rgbState)
  const numLeds = $derived(keyboard.metadata.rgb?.numLeds ?? 0)
  const allLeds = $derived([...Array(numLeds)].map((_, i) => i))
</script>

<KeyboardEditor.Menubar>
  <div class="flex items-center gap-2">
    <Button
      disabled={numLeds === 0 || allLeds.every((led) => leds.has(led))}
      onclick={() => allLeds.forEach((led) => rgbState.leds.add(led))}
      size="sm"
      variant="outline"
    >
      Select All LEDs
    </Button>
    <Button
      disabled={leds.size === 0}
      onclick={() => rgbState.leds.clear()}
      size="sm"
      variant="outline"
    >
      Deselect All
    </Button>
    <Toggle
      bind:pressed={rgbState.showKeymap}
      size="sm"
      variant="outline"
    >
      Show Keymap
    </Toggle>
  </div>
  <div class="flex items-center gap-2">
    <Button
      onclick={() => {
        rgbQuery.setOptions({ data: structuredClone(defaultRGBOptions) })
        if (numLeds > 0) {
          rgbQuery.setColors({
            offset: 0,
            data: Array.from({ length: numLeds }, () => ({
              ...defaultRGBColor,
            })),
          })
        }
      }}
      size="sm"
      variant="destructive"
    >
      Reset RGB
    </Button>
    <KeyboardEditor.LayoutDialog />
  </div>
</KeyboardEditor.Menubar>

