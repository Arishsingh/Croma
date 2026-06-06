import type { BgMessage, BgResponse, Feature, Provider } from '../types'
import { SYSTEM_PROMPTS } from '../types'

chrome.runtime.onMessage.addListener((msg: BgMessage, sender, sendResponse) => {
  if (msg.type === 'SAVE_CONFIG') {
    chrome.storage.sync.set({ apiKey: msg.key, provider: msg.provider }, () => {
      sendResponse({ type: 'SAVED' } satisfies BgResponse)
    })
    return true
  }

  if (msg.type === 'GET_CONFIG') {
    chrome.storage.sync.get(['apiKey', 'provider'], (r) => {
      sendResponse({
        type: 'CONFIG',
        key: r.apiKey ?? null,
        provider: (r.provider as Provider) ?? 'anthropic',
      } satisfies BgResponse)
    })
    return true
  }

  if (msg.type === 'ASK_CLAUDE') {
    const tabId = sender.tab?.id
    if (tabId !== undefined) {
      chrome.storage.sync.get(['apiKey', 'provider'], (r) => {
        const provider: Provider = (r.provider as Provider) ?? 'anthropic'
        streamResponse(msg.prompt, msg.feature, msg.context, tabId, r.apiKey ?? null, provider)
      })
    }
    return false
  }
})

async function streamResponse(
  prompt: string,
  feature: Feature,
  context: string | undefined,
  tabId: number,
  apiKey: string | null,
  provider: Provider
) {
  if (!apiKey) {
    chrome.tabs.sendMessage(tabId, {
      type: 'ERROR',
      message: 'No API key set. Click the Croma icon to add one.',
    } satisfies BgResponse)
    return
  }

  const content = context ? `Page context:\n${context}\n\n---\n\n${prompt}` : prompt

  try {
    if (provider === 'anthropic') {
      await streamAnthropic(content, feature, apiKey, tabId)
    } else {
      await streamOpenAI(content, feature, apiKey, tabId)
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Network error'
    chrome.tabs.sendMessage(tabId, { type: 'ERROR', message } satisfies BgResponse)
  }
}

async function streamAnthropic(content: string, feature: Feature, apiKey: string, tabId: number) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      stream: true,
      system: SYSTEM_PROMPTS[feature],
      messages: [{ role: 'user', content }],
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Anthropic API error ${response.status}: ${body}`)
  }

  await readSSEStream(response, tabId, (event) => {
    if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
      return event.delta.text as string
    }
    return null
  })
}

async function streamOpenAI(content: string, feature: Feature, apiKey: string, tabId: number) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 1024,
      stream: true,
      messages: [
        { role: 'system', content: SYSTEM_PROMPTS[feature] },
        { role: 'user', content },
      ],
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`OpenAI API error ${response.status}: ${body}`)
  }

  await readSSEStream(response, tabId, (event) => {
    const text = event.choices?.[0]?.delta?.content
    return typeof text === 'string' ? text : null
  })
}

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
        if (text) {
          chrome.tabs.sendMessage(tabId, { type: 'CHUNK', text } satisfies BgResponse)
        }
      } catch {}
    }
  }

  chrome.tabs.sendMessage(tabId, { type: 'DONE' } satisfies BgResponse)
}
