// @vitest-environment happy-dom

import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BrzaExpandLayer } from './BrzaExpandLayer'

const SKILL =
  '---\nname: brza-review\ndescription: Reviews a diff\n---\n\n# Review\n\nRead [the guide](./guide.md).'

function renderChat(): void {
  render(
    <div data-native-chat-root="true">
      <div data-native-chat-code-block="">
        <pre data-native-chat-code-content="" data-testid="short">
          {'one\ntwo\nthree'}
        </pre>
      </div>
      <div
        data-native-chat-code-content=""
        data-native-chat-diff="lines"
        data-testid="tool-diff"
        className="overflow-hidden"
      >
        <div>+added</div>
      </div>
      <div
        data-native-chat-code-content=""
        data-native-chat-diff="rows"
        data-testid="card-diff"
        className="max-h-72 overflow-auto"
      >
        <div>-removed</div>
      </div>
      <FencedBlock language="markdown" testId="markdown" code={SKILL} />
      <FencedBlock language="md" testId="md" code={SKILL} />
      <FencedBlock language="ts" testId="ts" code="const a = 1" />
      <BrzaExpandLayer />
    </div>
  )
}

function FencedBlock(props: { language: string; testId: string; code: string }) {
  return (
    <div data-native-chat-code-block="">
      <div>
        <span data-code-language={props.language}>{props.language}</span>
      </div>
      <pre data-native-chat-code-content="" data-testid={props.testId}>
        <code>{props.code}</code>
      </pre>
    </div>
  )
}

function expand(testId: string): HTMLElement {
  fireEvent.mouseOver(screen.getByTestId(testId))
  fireEvent.click(screen.getByRole('button', { name: 'Expand block' }))
  return screen.getByRole('dialog', { name: 'Expanded block' })
}

describe('BrzaExpandLayer', () => {
  const writeText = vi.fn(() => Promise.resolve())

  beforeEach(() => {
    writeText.mockClear()
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
  })
  afterEach(cleanup)

  it.each(['short', 'tool-diff', 'card-diff'])('offers ⤢ over %s, scrolling or not', (testId) => {
    renderChat()
    fireEvent.mouseOver(screen.getByTestId(testId))
    expect(screen.getByRole('button', { name: 'Expand block' })).toBeInTheDocument()
  })

  it('opens a copy of the block over the chat, and Esc closes it', () => {
    renderChat()
    const short = screen.getByTestId('short')
    const overlay = expand('short')
    expect(overlay).toHaveTextContent('one two three'.replaceAll(' ', '\n'), {
      normalizeWhitespace: false
    })
    expect(overlay.querySelector('[data-native-chat-code-content]')).toBeNull()
    expect(short).toHaveAttribute('data-native-chat-code-content')
    expect(within(overlay).queryByRole('radio', { name: 'Preview' })).toBeNull()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it.each(['markdown', 'md'])(
    'opens a %s fence in the preview, with the front matter apart',
    (testId) => {
      renderChat()
      const overlay = expand(testId)
      expect(within(overlay).getByRole('radio', { name: 'Preview' })).toHaveAttribute(
        'aria-checked',
        'true'
      )
      expect(within(overlay).getByRole('heading', { level: 1, name: 'Review' })).toBeInTheDocument()
      const frontMatter = within(overlay).getByText('Front Matter').parentElement
      expect(frontMatter).toHaveTextContent('name: brza-review')
      expect(overlay.querySelectorAll('.markdown-body p')).toHaveLength(1)
      expect(overlay.querySelector('.markdown-body > p')).not.toHaveTextContent('name:')
      expect(within(overlay).queryByRole('button', { name: 'Wrap lines' })).toBeNull()
    }
  )

  it('shows the raw fence under <>, with the wrap toggle', () => {
    renderChat()
    const overlay = expand('markdown')
    fireEvent.click(within(overlay).getByRole('radio', { name: 'Source' }))
    expect(within(overlay).queryByRole('heading', { level: 1 })).toBeNull()
    expect(overlay).toHaveTextContent('# Review')
    expect(within(overlay).getByRole('button', { name: 'Wrap lines' })).toBeInTheDocument()
  })

  it('leaves a relative link in the preview without an action', () => {
    renderChat()
    const overlay = expand('markdown')
    const link = within(overlay).getByRole('link', { name: 'the guide' })
    const click = new MouseEvent('click', { bubbles: true, cancelable: true })
    link.dispatchEvent(click)
    expect(click.defaultPrevented).toBe(true)
  })

  it('copies the raw fence in both modes', () => {
    renderChat()
    const overlay = expand('markdown')
    fireEvent.click(within(overlay).getByRole('button', { name: 'Copy code' }))
    fireEvent.click(within(overlay).getByRole('radio', { name: 'Source' }))
    fireEvent.click(within(overlay).getByRole('button', { name: 'Copy code' }))
    expect(writeText).toHaveBeenCalledTimes(2)
    expect(writeText).toHaveBeenNthCalledWith(1, SKILL)
    expect(writeText).toHaveBeenNthCalledWith(2, SKILL)
  })

  it('keeps other languages on the raw view, without the toggle', () => {
    renderChat()
    const overlay = expand('ts')
    expect(within(overlay).queryByRole('radio')).toBeNull()
    expect(overlay).toHaveTextContent('const a = 1')
  })
})
