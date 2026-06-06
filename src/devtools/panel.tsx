import { render } from 'preact'
import { useState, useRef } from 'preact/hooks'
import './panel.css'

interface NetworkEntry {
  id: number
  method: string
  url: string
  status: number
  duration: number
  flagged: boolean
}

interface AiResult {
  requestId: number
  text: string
  loading: boolean
}

let nextId = 0

function Panel() {
  const [requests, setRequests] = useState<NetworkEntry[]>([])
  const [results, setResults] = useState<Map<number, AiResult>>(new Map())
  const [consoleInput, setConsoleInput] = useState('')
  const [consoleOutput, setConsoleOutput] = useState('')
  const [consoleLoading, setConsoleLoading] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Monitor network requests via DevTools API
  chrome.devtools.network.onRequestFinished.addListener((req) => {
    const id = nextId++
    const duration = req.time
    const status = req.response.status
    const flagged = status >= 400 || duration > 1500

    const entry: NetworkEntry = {
      id,
      method: req.request.method,
      url: req.request.url,
      status,
      duration: Math.round(duration),
      flagged,
    }

    setRequests((prev) => [entry, ...prev].slice(0, 50))

    if (flagged) {
      req.getContent((body) => {
        analyzeRequest(id, entry, body)
      })
    }
  })

  async function analyzeRequest(id: number, entry: NetworkEntry, body: string) {
    setResults((prev) => new Map(prev).set(id, { requestId: id, text: '', loading: true }))

    const prompt = entry.status >= 400
      ? `API request failed:\n${entry.method} ${entry.url}\nStatus: ${entry.status}\nResponse: ${body.slice(0, 400)}\n\nExplain why and how to fix.`
      : `Slow request (${entry.duration}ms):\n${entry.method} ${entry.url}\nStatus: ${entry.status}\n\nWhy is this slow? How to optimize?`

    const { apiKey } = await chrome.storage.sync.get('apiKey')
    if (!apiKey) return

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 512,
        stream: true,
        system: 'You are an API debugging expert. Be concise.',
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const event = JSON.parse(line.slice(6))
          if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            setResults((prev) => {
              const next = new Map(prev)
              const cur = next.get(id)!
              next.set(id, { ...cur, text: cur.text + event.delta.text })
              return next
            })
          }
        } catch {}
      }
    }

    setResults((prev) => {
      const next = new Map(prev)
      const cur = next.get(id)!
      next.set(id, { ...cur, loading: false })
      return next
    })
  }

  async function runConsole(e: Event) {
    e.preventDefault()
    const input = consoleInput.trim()
    if (!input) return

    // Separate JS code from @croma queries
    const lines = input.split('\n')
    const jsLines = lines.filter((l) => !l.trim().startsWith('// @croma'))
    const query = lines.find((l) => l.trim().startsWith('// @croma'))?.replace('// @croma', '').trim()

    setConsoleLoading(true)
    setConsoleOutput('')

    // Run the JS part
    let jsResult = ''
    if (jsLines.join('\n').trim()) {
      jsResult = await new Promise<string>((resolve) => {
        chrome.devtools.inspectedWindow.eval(jsLines.join('\n'), (result, err) => {
          resolve(err ? `Error: ${JSON.stringify(err)}` : JSON.stringify(result, null, 2))
        })
      })
    }

    if (!query) {
      setConsoleOutput(jsResult)
      setConsoleLoading(false)
      return
    }

    // Get DOM snapshot for context
    const domCount = await new Promise<string>((resolve) => {
      chrome.devtools.inspectedWindow.eval(
        'document.body.innerHTML.slice(0, 2000)',
        (result) => resolve(String(result))
      )
    })

    const { apiKey } = await chrome.storage.sync.get('apiKey')
    if (!apiKey) {
      setConsoleOutput('No API key set — click the Croma toolbar icon.')
      setConsoleLoading(false)
      return
    }

    const context = `JS result: ${jsResult}\nDOM snapshot: ${domCount}`
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 512,
        stream: true,
        system: 'You are a JavaScript expert with access to the live page context. Answer based on the actual runtime values.',
        messages: [{ role: 'user', content: `${context}\n\nQuestion: ${query}` }],
      }),
    })

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines2 = buffer.split('\n')
      buffer = lines2.pop() ?? ''
      for (const line of lines2) {
        if (!line.startsWith('data: ')) continue
        try {
          const event = JSON.parse(line.slice(6))
          if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            setConsoleOutput((prev) => prev + event.delta.text)
          }
        } catch {}
      }
    }

    setConsoleLoading(false)
  }

  return (
    <div class="panel">
      <div class="section">
        <h2 class="section-title">API Inspector</h2>
        <div class="requests">
          {requests.length === 0 && (
            <div class="empty">Network requests will appear here.</div>
          )}
          {requests.map((r) => (
            <div key={r.id} class={`request${r.flagged ? ' flagged' : ''}`}>
              <div class="request-header">
                <span class="method">{r.method}</span>
                <span class="url" title={r.url}>{r.url}</span>
                <span class={`status ${r.status >= 400 ? 'err' : ''}`}>{r.status}</span>
                <span class={`duration ${r.duration > 1500 ? 'slow' : ''}`}>{r.duration}ms</span>
              </div>
              {results.has(r.id) && (
                <div class="ai-result">
                  {results.get(r.id)!.loading
                    ? <span class="loading">Analyzing…</span>
                    : results.get(r.id)!.text}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div class="divider" />

      <div class="section">
        <h2 class="section-title">AI Console</h2>
        <p class="hint">Write JS normally. Add <code>// @croma your question</code> to ask Claude about the result.</p>
        <form onSubmit={runConsole} class="console-form">
          <textarea
            ref={inputRef}
            class="console-input"
            value={consoleInput}
            onInput={(e) => setConsoleInput((e.target as HTMLTextAreaElement).value)}
            placeholder={'const items = document.querySelectorAll(\'.item\')\n// @croma why are only 3 showing?'}
            rows={5}
          />
          <button type="submit" class="run-btn" disabled={consoleLoading}>
            {consoleLoading ? 'Running…' : 'Run'}
          </button>
        </form>
        {consoleOutput && (
          <pre class="console-output">{consoleOutput}</pre>
        )}
      </div>
    </div>
  )
}

render(<Panel />, document.getElementById('root')!)
