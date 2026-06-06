import { render } from 'preact'
import { SidebarApp, sidebar, setDocsQuestionHandler } from './SidebarApp'
import type { BgMessage, BgResponse, Feature } from '../types'

const isTopFrame = window === window.top

if (isTopFrame) {
  const host = document.createElement('div')
  host.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;'
  document.documentElement.appendChild(host)
  const shadow = host.attachShadow({ mode: 'open' })
  const mountPoint = document.createElement('div')
  shadow.appendChild(mountPoint)
  render(<SidebarApp />, mountPoint)
}

const isLocalhost = ['localhost', '127.0.0.1', '0.0.0.0'].some(
  (h) => location.hostname === h || location.hostname.startsWith(h + ':')
)

function isExtensionAlive() {
  try {
    return !!chrome.runtime?.id
  } catch {
    return false
  }
}

function ask(prompt: string, feature: Feature, context?: string) {
  if (!isExtensionAlive()) return
  if (isTopFrame) {
    sidebar.show(feature)
  } else {
    window.top?.postMessage({ __croma: true, type: 'SHOW', feature }, '*')
  }
  try {
    chrome.runtime.sendMessage({
      type: 'ASK_CLAUDE',
      prompt,
      feature,
      context,
    } satisfies BgMessage)
  } catch {
    if (isTopFrame) sidebar.error('Extension was reloaded. Refresh this page to reconnect Croma.')
  }
}

if (isTopFrame) {
  window.addEventListener('message', (e) => {
    if (e.data?.__croma && e.data.type === 'SHOW') {
      sidebar.show(e.data.feature as Feature)
    }
  })
}

setDocsQuestionHandler((question) => {
  const pageContent = document.body.innerText.slice(0, 30_000)
  ask(question, 'docs-ai', pageContent)
})

if (isTopFrame && isExtensionAlive()) {
  chrome.runtime.onMessage.addListener((msg: BgResponse) => {
    if (msg.type === 'CHUNK') sidebar.chunk(msg.text)
    if (msg.type === 'DONE') sidebar.done()
    if (msg.type === 'ERROR') sidebar.error(msg.message)
  })
}

const CODE_RE = /[{}[\]();=><]|function |const |let |var |import |class |def |return |=>/
let selectionTimer: ReturnType<typeof setTimeout>
let lastAskedText = ''

document.addEventListener('selectionchange', () => {
  clearTimeout(selectionTimer)
  selectionTimer = setTimeout(() => {
    const text = window.getSelection()?.toString().trim() ?? ''
    if (!text || text === lastAskedText) return

    const isCode = CODE_RE.test(text) && text.length >= 30
    const isText = !isCode && text.length >= 60
    if (!isCode && !isText) return

    lastAskedText = text
    const prompt = isCode
      ? `Explain this code:\n\`\`\`\n${text}\n\`\`\``
      : `Explain this clearly and concisely:\n\n${text}`

    ask(prompt, 'code-explain')
  }, 600)
})

if (isLocalhost) {
  const _consoleError = console.error.bind(console)
  console.error = (...args: unknown[]) => {
    _consoleError(...args)
    const msg = args.map(String).join(' ')
    if (msg.length < 10) return
    ask(`Fix this console error:\n${msg}`, 'error-fix')
  }

  window.addEventListener('error', (e) => {
    const info = [
      `Error: ${e.message}`,
      `File: ${e.filename}:${e.lineno}:${e.colno}`,
      e.error?.stack ? `Stack:\n${e.error.stack}` : '',
    ].filter(Boolean).join('\n')
    ask(`Fix this runtime error:\n${info}`, 'error-fix')
  })

  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason instanceof Error
      ? `${e.reason.message}\n${e.reason.stack ?? ''}`
      : String(e.reason)
    ask(`Fix this unhandled promise rejection:\n${reason}`, 'error-fix')
  })
}

const _fetch = window.fetch.bind(window)
window.fetch = async (...args: Parameters<typeof fetch>) => {
  const start = Date.now()
  const response = await _fetch(...args)
  const duration = Date.now() - start

  if (response.status >= 400 || duration > 1500) {
    const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url
    const method = (args[1]?.method ?? 'GET').toUpperCase()
    const clone = response.clone()
    const body = await clone.text().catch(() => '').then((t) => t.slice(0, 400))

    const prompt = response.status >= 400
      ? `API request failed:\n${method} ${url}\nStatus: ${response.status}\nResponse body: ${body}\n\nWhy did this fail and how do I fix it?`
      : `API request is slow (${duration}ms):\n${method} ${url}\nStatus: ${response.status}\n\nWhat's likely causing the slowness and how do I optimize it?`

    ask(prompt, 'network-explain')
  }

  return response
}
