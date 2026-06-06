import { useState, useEffect, useRef } from 'preact/hooks'
import type { Feature } from '../types'
import { FEATURE_LABELS } from '../types'

type Mode = 'idle' | 'loading' | 'streaming' | 'done' | 'error'
interface SidebarState { visible: boolean; feature: Feature; text: string; mode: Mode }

const initial: SidebarState = { visible: false, feature: 'code-explain', text: '', mode: 'idle' }
let _setState: ((s: SidebarState) => void) | null = null
let _state: SidebarState = { ...initial }
function update(patch: Partial<SidebarState>) { _state = { ..._state, ...patch }; _setState?.(_state) }

export const sidebar = {
  show:  (feature: Feature) => update({ visible: true, feature, text: '', mode: 'loading' }),
  hide:  () => update({ visible: false }),
  chunk: (text: string) => update({ text: _state.text + text, mode: 'streaming' }),
  done:  () => update({ mode: 'done' }),
  error: (msg: string)   => update({ text: msg, mode: 'error' }),
}

let _onDocsQuestion: ((q: string) => void) | null = null
export function setDocsQuestionHandler(fn: (q: string) => void) { _onDocsQuestion = fn }

function md(raw: string): string {
  let s = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // fenced code blocks
  s = s.replace(/```(?:\w*)\n?([\s\S]*?)```/g, (_, code) =>
    `<pre><code>${code.trim()}</code></pre>`)

  // inline code
  s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>')

  // bold
  s = s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')

  // section markers like "→ What this does:"
  s = s.replace(/^(→\s.+:)\s*$/gm, '<p class="sec">$1</p>')

  // numbered list items  "1. "
  s = s.replace(/^(\d+)\.\s+/gm, '<span class="num">$1</span> ')

  // dash/arrow bullets
  s = s.replace(/^\s*[-–]\s+/gm, '<span class="bul">—</span> ')

  // paragraphs: split on double newline
  const blocks = s.split(/\n{2,}/)
  return blocks.map(b => {
    if (b.startsWith('<pre>') || b.startsWith('<p class="sec">')) return b
    const lines = b.split('\n').filter(Boolean).join('<br>')
    return `<p>${lines}</p>`
  }).join('')
}

const CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.root {
  position: fixed; top: 0; right: 0;
  width: 360px; height: 100vh;
  z-index: 2147483647;
  display: flex; flex-direction: column;
  background: #0a0a0b;
  color: #d4d4d8;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  font-size: 13px; line-height: 1.6;
  border-left: 1px solid #18181b;
  box-shadow: -8px 0 48px rgba(0,0,0,0.7);
  transition: transform 0.22s ease;
}
.root.off { transform: translateX(100%); pointer-events: none; }

/* ── header ── */
.hd {
  display: flex; align-items: center; justify-content: space-between;
  padding: 11px 14px;
  border-bottom: 1px solid #18181b;
  flex-shrink: 0;
}
.brand { font-size: 13px; font-weight: 600; letter-spacing: -0.2px; color: #fafafa; }
.brand em { font-style: normal; color: #71717a; font-weight: 400; }
.tag {
  font-size: 10px; font-weight: 500; letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 2px 7px; border-radius: 3px;
  background: #18181b; color: #a1a1aa; border: 1px solid #27272a;
  margin-left: 8px;
}
.x {
  width: 22px; height: 22px; border-radius: 4px;
  background: none; border: none;
  color: #52525b; font-size: 14px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: color .15s, background .15s;
}
.x:hover { color: #d4d4d8; background: #18181b; }

/* ── body ── */
.bd {
  flex: 1; overflow-y: auto; padding: 16px 14px;
  scrollbar-width: thin; scrollbar-color: #27272a transparent;
}
.bd::-webkit-scrollbar { width: 3px; }
.bd::-webkit-scrollbar-thumb { background: #27272a; border-radius: 2px; }

/* idle */
.empty {
  height: 100%; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 6px; color: #3f3f46; text-align: center;
}
.empty-title { font-size: 12px; font-weight: 500; color: #52525b; margin-bottom: 8px; }
.hint {
  width: 100%; font-size: 11.5px; padding: 7px 10px;
  background: #111113; border: 1px solid #1e1e22;
  border-radius: 5px; color: #52525b; text-align: left;
}
.hint b { color: #71717a; font-weight: 600; }

/* loading */
.ld { display: flex; align-items: center; gap: 8px; padding: 2px 0; }
.ld-text { font-size: 11.5px; color: #52525b; }
.dots { display: flex; gap: 3px; }
.dot {
  width: 5px; height: 5px; background: #3f3f46; border-radius: 50%;
  animation: blink 1.2s ease-in-out infinite;
}
.dot:nth-child(2) { animation-delay: .2s; }
.dot:nth-child(3) { animation-delay: .4s; }
@keyframes blink {
  0%,80%,100% { opacity:.2; transform:scale(.8); }
  40% { opacity:1; transform:scale(1); }
}

/* output */
.out { color: #d4d4d8; font-size: 13px; }
.out p { margin-bottom: 10px; }
.out p:last-child { margin-bottom: 0; }
.out b { color: #fafafa; font-weight: 600; }
.out code {
  font-family: 'SF Mono','Fira Code',Menlo,monospace;
  font-size: 11.5px;
  background: #111113; border: 1px solid #1e1e22;
  border-radius: 3px; padding: 1px 5px; color: #a1a1aa;
}
.out pre {
  background: #0d0d0f; border: 1px solid #1e1e22;
  border-radius: 6px; padding: 12px; margin: 10px 0;
  overflow-x: auto;
}
.out pre code {
  background: none; border: none; padding: 0;
  color: #d4d4d8; font-size: 12px; line-height: 1.65;
}
.out .sec {
  font-size: 10.5px; font-weight: 700; letter-spacing: .07em;
  text-transform: uppercase; color: #52525b;
  margin: 14px 0 6px; padding-bottom: 6px;
  border-bottom: 1px solid #18181b;
}
.out .num {
  display: inline-flex; align-items: center; justify-content: center;
  width: 16px; height: 16px; font-size: 10px; font-weight: 700;
  background: #18181b; border: 1px solid #27272a;
  border-radius: 3px; color: #71717a; vertical-align: middle;
  margin-right: 2px;
}
.out .bul { color: #3f3f46; margin-right: 4px; }
.out.err { color: #f87171; }

/* actions */
.acts { display: flex; gap: 6px; margin-top: 14px; }
.btn {
  padding: 5px 11px; font-size: 11.5px; font-weight: 500;
  font-family: inherit; border-radius: 5px; cursor: pointer;
  transition: all .15s;
}
.btn-copy {
  background: #111113; border: 1px solid #27272a; color: #a1a1aa;
}
.btn-copy:hover { border-color: #3f3f46; color: #d4d4d8; }
.btn-dim {
  background: none; border: 1px solid #18181b; color: #3f3f46;
}
.btn-dim:hover { color: #71717a; border-color: #27272a; }

/* ── footer ── */
.sep { height: 1px; background: #111113; flex-shrink: 0; }
.ft { padding: 10px 12px; flex-shrink: 0; }
.row {
  display: flex; align-items: center; gap: 6px;
  background: #111113; border: 1px solid #1e1e22;
  border-radius: 6px; padding: 7px 10px;
  transition: border-color .15s;
}
.row:focus-within { border-color: #3f3f46; }
.inp {
  flex: 1; background: none; border: none; outline: none;
  color: #d4d4d8; font-family: inherit; font-size: 12.5px;
}
.inp::placeholder { color: #3f3f46; }
.send {
  padding: 4px 10px; background: #18181b;
  border: 1px solid #27272a; border-radius: 4px;
  color: #71717a; font-size: 11px; font-weight: 600;
  font-family: inherit; cursor: pointer; transition: all .15s;
  flex-shrink: 0;
}
.send:hover { background: #27272a; color: #d4d4d8; }
`

export function SidebarApp() {
  const [s, setS]   = useState<SidebarState>(_state)
  const [q, setQ]   = useState('')
  const [ok, setOk] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  _setState = setS

  useEffect(() => {
    if (ref.current && s.mode === 'streaming')
      ref.current.scrollTop = ref.current.scrollHeight
  }, [s.text])

  function ask(e: Event) {
    e.preventDefault()
    if (!q.trim()) return
    sidebar.show('docs-ai')
    _onDocsQuestion?.(q.trim())
    setQ('')
  }

  function copy() {
    navigator.clipboard.writeText(s.text)
    setOk(true); setTimeout(() => setOk(false), 1400)
  }

  return (
    <>
      <style>{CSS}</style>
      <div class={`root${s.visible ? '' : ' off'}`}>

        {/* header */}
        <div class="hd">
          <div style={{ display:'flex', alignItems:'center' }}>
            <span class="brand">Croma</span>
          </div>
          <button class="x" onClick={() => sidebar.hide()}>✕</button>
        </div>

        {/* body */}
        <div class="bd" ref={ref}>
          {s.mode === 'idle' && (
            <div class="empty">
              <div class="empty-title">Ready</div>
              <div class="hint"><b>Select code</b> or text on any page</div>
              <div class="hint"><b>Errors</b> on localhost are caught automatically</div>
              <div class="hint"><b>Ask below</b> about anything on this page</div>
            </div>
          )}

          {s.mode === 'loading' && (
            <div class="ld">
              <div class="dots">
                <div class="dot"/><div class="dot"/><div class="dot"/>
              </div>
              <span class="ld-text">Thinking…</span>
            </div>
          )}

          {(s.mode === 'streaming' || s.mode === 'done' || s.mode === 'error') && (
            <>
              <div
                class={`out${s.mode === 'error' ? ' err' : ''}`}
                dangerouslySetInnerHTML={{ __html: md(s.text) }}
              />
              {s.mode === 'done' && s.text && (
                <div class="acts">
                  <button class="btn btn-copy" onClick={copy}>{ok ? '✓ Copied' : 'Copy'}</button>
                  <button class="btn btn-dim" onClick={() => sidebar.hide()}>Dismiss</button>
                </div>
              )}
            </>
          )}
        </div>

        <div class="sep"/>

        {/* footer */}
        <div class="ft">
          <form onSubmit={ask}>
            <div class="row">
              <input
                class="inp" type="text" value={q}
                onInput={e => setQ((e.target as HTMLInputElement).value)}
                placeholder="Ask about this page…"
              />
              <button class="send" type="submit">Ask</button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
