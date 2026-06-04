import { definePlugin, type PlainExtension } from 'prosekit/core'
import {
  PluginKey,
  ProseMirrorPlugin,
  type EditorState,
  type Transaction,
} from 'prosekit/pm/state'
import { Decoration, DecorationSet } from 'prosekit/pm/view'

export type CurrentVirtualSelectionExtension = PlainExtension

export function defineCurrentVirtualSelection(): CurrentVirtualSelectionExtension {
  return definePlugin(currentVirtualSelectionPlugin)
}

type PluginState = boolean

const key = new PluginKey<PluginState>('repro-current-virtual-selection')

function getFocusMeta(tr: Transaction): PluginState | undefined {
  return tr.getMeta(key) as PluginState | undefined
}

function setFocusMeta(tr: Transaction, value: PluginState) {
  return tr.setMeta(key, value)
}

function getFocusState(state: EditorState): PluginState | undefined {
  return key.getState(state)
}

const currentVirtualSelectionPlugin = new ProseMirrorPlugin<PluginState>({
  key,
  state: {
    init: () => false,
    apply: (tr, value) => {
      return getFocusMeta(tr) ?? value
    },
  },
  props: {
    handleDOMEvents: {
      focus: (view) => {
        view.dispatch(setFocusMeta(view.state.tr, false))
      },

      blur: (view) => {
        const { dom, root } = view
        const activeElement = root.activeElement

        if (activeElement === dom) return

        view.dispatch(setFocusMeta(view.state.tr, true))
      },
    },
    decorations: (state) => {
      const { selection, doc } = state

      if (
        selection.empty
        || !getFocusState(state)
        || !selection.visible
      ) {
        return null
      }

      return DecorationSet.create(doc, [
        Decoration.inline(selection.from, selection.to, {
          class: 'prosekit-virtual-selection',
          'data-virtual-selection': 'current',
        }),
      ])
    },
  },
})
