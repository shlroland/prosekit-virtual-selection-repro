import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Popover from '@mui/material/Popover'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { HexColorPicker } from 'react-colorful'
import {
  createEditor,
  defineBaseCommands,
  defineBaseKeymap,
  defineHistory,
  union,
  type NodeJSON,
  type PlainExtension,
} from 'prosekit/core'
import { defineDoc } from 'prosekit/extensions/doc'
import { defineParagraph } from 'prosekit/extensions/paragraph'
import { defineText } from 'prosekit/extensions/text'
import { defineTextColor } from 'prosekit/extensions/text-color'
import { TextSelection } from 'prosekit/pm/state'
import { ProseKit } from 'prosekit/react'
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'

import { defineCurrentVirtualSelection } from './virtual-selection-current'
import { defineFixedVirtualSelection } from './virtual-selection-fixed'

const targetText = 'drag or click the color picker'

const defaultContent: NodeJSON = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Select this phrase: ' },
        { type: 'text', text: targetText },
        { type: 'text', text: '. Then open the color picker and click or drag inside it.' },
      ],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text:
            'All pages use the same npm prosekit package, the same MUI Popover, and the same react-colorful picker. Only the virtual-selection extension changes.',
        },
      ],
    },
  ],
}

type Mode = 'current' | 'fixed' | 'none'

type DebugState = {
  editorFocused: boolean
  pmSelection: string
  domSelection: string
  virtualSelection: string
  activeElement: string
}

type SavedRange = {
  from: number
  to: number
}

function getMode(): Mode {
  if (window.location.pathname.includes('/none')) return 'none'
  return window.location.pathname.includes('/fixed') ? 'fixed' : 'current'
}

function describeElement(element: Element | null): string {
  if (!element) return 'null'
  const id = element.id ? `#${element.id}` : ''
  const className = typeof element.className === 'string'
    ? `.${element.className.split(/\s+/).filter(Boolean).slice(0, 2).join('.')}`
    : ''
  return `${element.tagName.toLowerCase()}${id}${className}`
}

function createExtension(defineVirtualSelection?: () => PlainExtension) {
  const base = [
    defineDoc(),
    defineText(),
    defineParagraph(),
    defineTextColor(),
    defineBaseCommands(),
    defineBaseKeymap(),
    defineHistory(),
  ] as const

  return defineVirtualSelection
    ? union(...base, defineVirtualSelection())
    : union(...base)
}

function useDebugState(editor: ReturnType<typeof createEditor>): DebugState {
  const [debug, setDebug] = useState<DebugState>({
    editorFocused: false,
    pmSelection: '',
    domSelection: '',
    virtualSelection: '',
    activeElement: '',
  })

  useEffect(() => {
    const timer = window.setInterval(() => {
      const view = editor.view
      const selection = view?.state.selection
      const domSelection = window.getSelection()
      const virtualSelection = Array.from(
        view?.dom.querySelectorAll('.prosekit-virtual-selection') ?? [],
      ).map((node) => node.textContent ?? '').join('|')

      setDebug({
        editorFocused: Boolean(editor.focused),
        pmSelection: selection
          ? `${selection.constructor.name} ${selection.from}-${selection.to} empty=${selection.empty}`
          : 'none',
        domSelection: domSelection
          ? `"${domSelection.toString()}" collapsed=${domSelection.isCollapsed}`
          : 'none',
        virtualSelection: virtualSelection || 'none',
        activeElement: describeElement(document.activeElement),
      })
    }, 120)

    return () => window.clearInterval(timer)
  }, [editor])

  return debug
}

function selectPhrase(editor: ReturnType<typeof createEditor>) {
  const view = editor.view
  const { doc } = view.state
  let range: { from: number; to: number } | undefined

  doc.descendants((node, pos) => {
    if (!node.isText) return true
    const text = node.text ?? ''
    const index = text.indexOf(targetText)
    if (index < 0) return true

    range = {
      from: pos + index,
      to: pos + index + targetText.length,
    }
    return false
  })

  if (!range) return

  view.dispatch(view.state.tr.setSelection(TextSelection.create(doc, range.from, range.to)))
  view.focus()
}

function restoreSelection(editor: ReturnType<typeof createEditor>, range: SavedRange | null) {
  if (!range) return
  const view = editor.view
  const { doc } = view.state
  if (range.from < 0 || range.to > doc.content.size || range.from > range.to) return

  view.dispatch(view.state.tr.setSelection(TextSelection.create(doc, range.from, range.to)))
}

function ColorPickerPopover(props: {
  editor: ReturnType<typeof createEditor>
  preventMouseDown?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [color, setColor] = useState('#2563eb')
  const savedRange = useRef<SavedRange | null>(null)

  const openPicker = (event: MouseEvent<HTMLElement>) => {
    const { selection } = props.editor.view.state
    savedRange.current = { from: selection.from, to: selection.to }
    setAnchorEl(event.currentTarget)
    setOpen(true)
  }

  const applyColor = (nextColor: string) => {
    setColor(nextColor)

    // Keep the command target stable. This is intentionally the same on both
    // pages so the only visual-selection difference comes from the extension.
    restoreSelection(props.editor, savedRange.current)

    const commands = props.editor.commands as {
      addTextColor: (options: { color: string }) => void
    }
    commands.addTextColor({ color: nextColor })
  }

  const mouseDownGuard = props.preventMouseDown
    ? {
      onMouseDownCapture: (event: MouseEvent<HTMLElement>) => {
        event.preventDefault()
      },
    }
    : undefined

  return (
    <>
      <Button
        variant="contained"
        onMouseDown={props.preventMouseDown ? (event) => event.preventDefault() : undefined}
        onClick={openPicker}
      >
        Open react-colorful
      </Button>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => {
          setOpen(false)
          props.editor.focus()
        }}
        disableAutoFocus
        disableEnforceFocus
        disableRestoreFocus
        slotProps={{
          paper: mouseDownGuard,
        }}
      >
        <Box className="pickerPanel" {...mouseDownGuard}>
          <HexColorPicker color={color} onChange={applyColor} />
          <Typography variant="caption" color="text.secondary">
            {props.preventMouseDown
              ? 'onMouseDown default is prevented on this no-virtual-selection page.'
              : 'Pointer defaults are intentionally not prevented.'}
          </Typography>
        </Box>
      </Popover>
    </>
  )
}

function Page(props: { mode: Mode }) {
  const defineVirtualSelection = props.mode === 'none'
    ? undefined
    : props.mode === 'fixed'
      ? defineFixedVirtualSelection
      : defineCurrentVirtualSelection

  const editor = useMemo(() => {
    return createEditor({
      extension: createExtension(defineVirtualSelection),
      defaultContent,
    })
  }, [defineVirtualSelection])

  const debug = useDebugState(editor)
  const title = props.mode === 'none'
    ? 'No virtual-selection'
    : props.mode === 'fixed'
      ? 'Fixed virtual-selection'
      : 'Current virtual-selection'

  const description = props.mode === 'none'
    ? 'This page does not install virtual-selection and prevents mousedown defaults in the picker.'
    : `This page uses the ${props.mode} local virtual-selection extension.`

  return (
    <Box className="page">
      <Stack className="layout" spacing={2}>
        <Box>
          <Typography variant="h5" component="h1">
            {title}
          </Typography>
          <Typography color="text.secondary">
            {description}
          </Typography>
        </Box>

        <Paper className="nav" variant="outlined">
          <Button href="/current" variant={props.mode === 'current' ? 'contained' : 'outlined'}>
            Current page
          </Button>
          <Button href="/fixed" variant={props.mode === 'fixed' ? 'contained' : 'outlined'}>
            Fixed page
          </Button>
          <Button href="/none" variant={props.mode === 'none' ? 'contained' : 'outlined'}>
            No virtual-selection
          </Button>
        </Paper>

        <Paper className="toolbar" variant="outlined">
          <Button variant="outlined" onClick={() => selectPhrase(editor)}>
            Select target phrase
          </Button>
          <ColorPickerPopover editor={editor} preventMouseDown={props.mode === 'none'} />
          <Button
            variant="text"
            onClick={() => {
              const commands = editor.commands as { removeTextColor: () => void }
              commands.removeTextColor()
              editor.focus()
            }}
          >
            Clear text color
          </Button>
        </Paper>

        <Paper className="editorFrame" variant="outlined">
          <ProseKit editor={editor}>
            <div ref={editor.mount} className="editorContent" />
          </ProseKit>
        </Paper>

        <Paper className="debugPanel" variant="outlined">
          <div><strong>Editor focused:</strong> {String(debug.editorFocused)}</div>
          <div><strong>PM selection:</strong> {debug.pmSelection}</div>
          <div><strong>DOM selection:</strong> {debug.domSelection}</div>
          <div><strong>Virtual selection text:</strong> {debug.virtualSelection}</div>
          <div><strong>Active element:</strong> {debug.activeElement}</div>
        </Paper>
      </Stack>
    </Box>
  )
}

export default function App() {
  return <Page mode={getMode()} />
}
