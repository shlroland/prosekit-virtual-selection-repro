import { definePlugin, isTextSelection, type PlainExtension } from 'prosekit/core'
import {
  PluginKey,
  ProseMirrorPlugin,
  type Selection,
  type SelectionBookmark,
  type Transaction,
} from 'prosekit/pm/state'
import { Decoration, DecorationSet } from 'prosekit/pm/view'

export type FixedVirtualSelectionExtension = PlainExtension

export function defineFixedVirtualSelection(): FixedVirtualSelectionExtension {
  return definePlugin(fixedVirtualSelectionPlugin)
}

type PluginState = {
  bookmark: SelectionBookmark
  from: number
  to: number
} | null

const key = new PluginKey<PluginState>('repro-fixed-virtual-selection')
const activeClass = 'prosekit-virtual-selection-active'

function getSelectionMeta(tr: Transaction): PluginState | undefined {
  return tr.getMeta(key) as PluginState | undefined
}

function setSelectionMeta(tr: Transaction, value: PluginState) {
  return tr.setMeta(key, value)
}

function canDecorate(selection: Selection): boolean {
  return !selection.empty && selection.visible && isTextSelection(selection)
}

function toPluginState(selection: Selection): PluginState {
  if (!canDecorate(selection)) return null

  return {
    bookmark: selection.getBookmark(),
    from: selection.from,
    to: selection.to,
  }
}

const fixedVirtualSelectionPlugin = new ProseMirrorPlugin<PluginState>({
  key,
  state: {
    init: () => null,
    apply: (tr, value) => {
      const meta = getSelectionMeta(tr)
      if (meta !== undefined) return meta
      if (!value) return null
      if (!tr.docChanged) return value

      const bookmark = value.bookmark.map(tr.mapping)
      const selection = bookmark.resolve(tr.doc)
      return toPluginState(selection)
    },
  },
  props: {
    handleDOMEvents: {
      focus: (view) => {
        view.dispatch(setSelectionMeta(view.state.tr, null))
      },

      blur: (view) => {
        const { dom, root } = view
        const activeElement = root.activeElement

        if (activeElement === dom) return

        view.dispatch(setSelectionMeta(view.state.tr, toPluginState(view.state.selection)))
      },
    },
    decorations: (state) => {
      const pluginState = key.getState(state)
      if (!pluginState) return null

      return DecorationSet.create(state.doc, [
        Decoration.inline(pluginState.from, pluginState.to, {
          class: 'prosekit-virtual-selection',
          'data-virtual-selection': 'fixed',
        }),
      ])
    },
  },
  view: (view) => {
    const updateClass = () => {
      view.dom.classList.toggle(activeClass, Boolean(key.getState(view.state)))
    }

    updateClass()

    return {
      update: updateClass,
      destroy: () => {
        view.dom.classList.remove(activeClass)
      },
    }
  },
})
