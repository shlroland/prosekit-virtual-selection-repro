# ProseKit Virtual Selection Reproduction

Minimal reproduction for a ProseKit virtual-selection issue that appears when interacting with an external drag-based UI, such as `react-colorful`, inside an MUI `Popover`.

Repository: https://github.com/shlroland/prosekit-virtual-selection-repro

## Setup

```sh
pnpm install
pnpm run dev
```

Open these pages:

- `http://127.0.0.1:5177/current` - current virtual-selection behavior copied into a local extension.
- `http://127.0.0.1:5177/fixed` - experimental local extension that snapshots the selection range and hides native selection while virtual selection is active.
- `http://127.0.0.1:5177/none` - no virtual-selection, with `mousedown.preventDefault()` applied in the picker.

All pages use npm `prosekit@0.19.0`, the same MUI `Popover`, and the same `react-colorful` picker.

## Reproduction

1. Open `/current`.
2. Click `Select target phrase`.
3. Click `Open react-colorful`.
4. Click or drag inside the color picker.
5. Observe the visible editor selection and the debug panel.

## Expected

The selected editor text should remain visually stable after the editor loses focus and while interacting with the color picker.

## Actual

The visible selection can appear to extend or change unexpectedly while interacting with the color picker. When focus returns to the editor, the selection appears to recover.
