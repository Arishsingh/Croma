---
title: I Built a Chrome Extension That Watches My Dev Tab and Explains Everything
published: false
description: How I built Croma — an AI dev tools extension that auto-explains selected code, catches console errors, monitors slow API calls, and answers questions about any page you're on.
tags: javascript, chrome, ai, webdev
cover_image:
---

I kept alt-tabbing to ChatGPT to explain stack traces I was already staring at.

The error was right there on my screen. The fix was probably three sentences. And yet — copy, switch tab, paste, wait, read, switch back. Every single time.

So I built **Croma**. A Chrome extension that lives in a dark sidebar and watches what you're doing — explains selected code, catches console errors before you've even seen them, monitors failing API calls, and lets you ask questions about whatever page you're on.

No copy-paste. No alt-tab.

Here's how I built it, what tripped me up, and what I'd do differently.

---

## What It Does

Four things, all automatic:

- **Select any code or text** → the sidebar explains it
- **Console errors on localhost** → caught and diagnosed without you doing anything
- **Failing or slow API requests** → what went wrong and how to fix it
- **Ask anything about the page** → manual Q&A in the footer input

The goal was zero friction. You're debugging, you see something confusing, and the answer is already appearing before you've consciously decided to ask.

---

## Tech Stack

| Part | Choice | Why |
|---|---|---|
| UI framework | Preact | ~3kb, React-compatible, perfect for content scripts |
| Build tool | Vite + CRXJS | HMR for extensions during dev |
| Sidebar isolation | Shadow DOM | No CSS bleed from host page |
| API streaming | Raw fetch + SSE | No SDK bloat, works in service workers |
| Styling | Inline CSS string | Shadow DOM makes Tailwind painful |

I'll be honest — I reached for React first, saw it was 45kb, and immediately switched to Preact. For a content script that runs on every page you visit, bundle size is not a place to be casual.

---

## The Architecture

Three pieces, separated by Chrome's extension boundary:

```
Content Script (content.tsx)
      ↕  chrome.runtime.sendMessage
Service Worker (service-worker.ts)
      ↕  chrome.tabs.sendMessage
Content Script (receives response)
```

The content script captures events — text selection, errors, fetch calls — and ships them to the service worker. The service worker hits the Anthropic or OpenAI API, streams the response back chunk by chunk, and the sidebar renders it live.

The sidebar state lives at module level using a simple imperative pattern:

```ts
let _setState: ((s: SidebarState) => void) | null = null
let _state: SidebarState = { ...initial }

function update(patch: Partial<SidebarState>) {
  _state = { ..._state, ...patch }
  _setState?.(_state)
}

export const sidebar = {
  show:  (feature: Feature) => update({ visible: true, feature, text: '', mode: 'loading' }),
  chunk: (text: string)     => update({ text: _state.text + text, mode: 'streaming' }),
  done:  ()                 => update({ mode: 'done' }),
  error: (msg: string)      => update({ text: msg, mode: 'error' }),
}
```

The component calls `_setState = setS` on render. External events drive it. No Redux, no context, no prop drilling — just a module-level state machine that the content script calls directly.

---

## Streaming Without an SDK

The Anthropic TypeScript SDK is huge and wasn't designed with service workers in mind. I went raw instead:

```ts
async function readSSEStream(
  response: Response,
  tabId: number,
  extractText: (event: Record<string, unknown>) => string | null
) {
  const reader = response.body!.getReader()
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
      const data = line.slice(6).trim()
      if (data === '[DONE]') continue
      try {
        const event = JSON.parse(data) as Record<string, unknown>
        const text = extractText(event)
        if (text) chrome.tabs.sendMessage(tabId, { type: 'CHUNK', text })
      } catch {}
    }
  }

  chrome.tabs.sendMessage(tabId, { type: 'DONE' })
}
```

The key line is `buffer = lines.pop() ?? ''`. SSE chunks don't always split cleanly on newlines — a chunk can end mid-event. You always save the incomplete last line and prepend it to the next read.

The same function handles both Anthropic and OpenAI. You just pass a different `extractText` callback:

```ts
// Anthropic
(event) => event.type === 'content_block_delta' && event.delta?.type === 'text_delta'
  ? event.delta.text as string
  : null

// OpenAI
(event) => {
  const text = event.choices?.[0]?.delta?.content
  return typeof text === 'string' ? text : null
}
```

---

## Shadow DOM for Isolation

The sidebar needs to float above every website without the host site's CSS breaking it. Shadow DOM is the clean solution:

```ts
const host = document.createElement('div')
host.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;'
document.documentElement.appendChild(host)
const shadow = host.attachShadow({ mode: 'open' })
const mountPoint = document.createElement('div')
shadow.appendChild(mountPoint)
render(<SidebarApp />, mountPoint)
```

The host element is a zero-size anchor in the corner. The actual sidebar lives inside Shadow DOM, positioned `fixed` so it floats above everything. The host page's CSS resets, z-index wars, and `overflow: hidden` containers cannot touch it.

No iframe juggling, no `chrome.runtime.getURL` paths for HTML files, no cross-origin messaging required.

---

## Catching Errors Before You See Them

The localhost error monitor patches three surfaces:

```ts
// Console errors
const _consoleError = console.error.bind(console)
console.error = (...args: unknown[]) => {
  _consoleError(...args)
  const msg = args.map(String).join(' ')
  if (msg.length < 10) return
  ask(`Fix this console error:\n${msg}`, 'error-fix')
}

// Runtime errors
window.addEventListener('error', (e) => {
  const info = [
    `Error: ${e.message}`,
    `File: ${e.filename}:${e.lineno}:${e.colno}`,
    e.error?.stack ? `Stack:\n${e.error.stack}` : '',
  ].filter(Boolean).join('\n')
  ask(`Fix this runtime error:\n${info}`, 'error-fix')
})

// Unhandled promise rejections
window.addEventListener('unhandledrejection', (e) => {
  const reason = e.reason instanceof Error
    ? `${e.reason.message}\n${e.reason.stack ?? ''}`
    : String(e.reason)
  ask(`Fix this unhandled promise rejection:\n${reason}`, 'error-fix')
})
```

Localhost only — you don't want this running on every website you visit. The console patch calls through to the original so DevTools still shows the error. It just also routes it to Claude simultaneously.

---

## The Network Monitor

This one surprised me the most in practice. Wrap `window.fetch`:

```ts
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
```

The 1500ms threshold catches sluggish endpoints you might not notice in the Network tab until you specifically go looking. The `response.clone()` is required — you cannot read a response body twice, so you clone it before passing the original back to the caller.

---

## The Bug That Took Longest to Track Down

CRXJS generates a loader file with this line:

```js
})().catch(console.error)
```

When you reload the extension or navigate, the extension context gets invalidated and this fires — printing a red "Extension context invalidated" error to the console on every page load. Harmless in practice, but alarming to look at and embarrassing to ship.

The fix is a postbuild script:

```js
// scripts/postbuild.mjs
const files = await readdir(assetsDir)
for (const file of files) {
  if (!file.includes('-loader-') || !file.endsWith('.js')) continue
  const path = join(assetsDir, file)
  const content = await readFile(path, 'utf8')
  const patched = content.replace(
    /\}\)\(\)\s*\.\s*catch\s*\(\s*console\s*\.\s*error\s*\)/g,
    '})().catch(() => {})'
  )
  if (patched !== content) {
    await writeFile(path, patched)
    console.log(`Patched: ${file}`)
  }
}
```

Getting that regex right — especially the `\(\)` for the IIFE invocation — took two tries. The first version didn't match and I spent fifteen minutes wondering why the console was still yelling at me.

---

## What I'd Do Differently

**Rate limiting.** Right now if you rapidly select text it fires multiple simultaneous API calls. A simple abort-previous-in-flight would fix this and make it feel tighter.

**The devtools panel.** I built a network inspector and a `// @croma` comment evaluator that runs in the context of the inspected page. The fundamentals work but the polish isn't there yet.

**Smarter selection detection.** The 600ms debounce timer works, but occasionally fires on accidental swipes across text. A minimum word count check or movement distance check would reduce false positives.

---

## How to Run It

```bash
git clone https://github.com/arishsingh/croma
cd croma
npm install
npm run build
```

Then in Chrome:
1. Go to `chrome://extensions`
2. Enable Developer mode
3. Click "Load unpacked" → select the `dist/` folder
4. Click the Croma icon → paste your Anthropic or OpenAI API key

Works on any page. Most useful on localhost while you're actively building something — open a Next.js dev server, trigger an error, and watch the sidebar explain it before you've moved your hand to the keyboard.

---

## Links

- **GitHub**: [github.com/arishsingh/croma](https://github.com/arishsingh/croma)

If you build something with it or have ideas for what else it should catch automatically, drop it in the comments.
