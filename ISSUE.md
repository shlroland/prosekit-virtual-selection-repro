## Summary

`defineVirtualSelection()` can show an unstable or visually incorrect selection when focus moves from the editor to an external interactive widget, such as a color picker rendered in a popover. In my case this happens with `react-colorful` inside an MUI `Popover`.

## Reproduction

Minimal reproduction: TODO_REPO_URL

Steps:

1. Open `/current`.
2. Click `Select target phrase`.
3. Click `Open react-colorful`.
4. Click or drag inside the color picker.
5. Observe the editor selection while the editor is blurred.

The repro also includes:

- `/fixed`: an experimental local virtual-selection implementation.
- `/none`: no virtual-selection, with `mousedown.preventDefault()` applied to the picker.

## Expected behavior

After the editor loses focus, the visual selection should remain exactly on the text range that was selected before blur. Interacting with controls outside the editor should not make the highlighted range appear to grow, shrink, or move.

## Actual behavior

When interacting with the color picker, the visible selection can unexpectedly extend beyond the original selected text. When focus returns to the editor, the selection appears to recover.

## Notes

The current implementation appears to make two things hard to separate:

1. The virtual-selection decoration is based on the current editor state selection instead of a snapshot of the selection at blur time.
2. The browser's native DOM selection can still be visible while the virtual-selection decoration is active. External pointer interactions may change the native DOM selection, so the user can see a mixed result: the virtual decoration plus a native selection that no longer matches the original editor selection.

The `/none` page in the repro suggests that preventing the default `mousedown` behavior in the external picker can avoid the visual issue, but this is difficult for application code to guarantee for every external widget. It would be better if the virtual-selection extension itself could keep the blurred selection visually stable.

## Environment

- `prosekit`: `0.19.0`
- `react`: `19.2.7`
- `react-dom`: `19.2.7`
- `@mui/material`: `7.3.11`
- `react-colorful`: `5.7.0`
- Browser: reproducible in a modern Chromium-based browser
