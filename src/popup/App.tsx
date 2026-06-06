import { useState, useEffect } from 'preact/hooks'
import type { Provider } from '../types'

const PROVIDERS = [
  { id: 'anthropic' as Provider, label: 'Anthropic', placeholder: 'sk-ant-...' },
  { id: 'openai' as Provider, label: 'OpenAI', placeholder: 'sk-...' },
]

export function App() {
  const [provider, setProvider] = useState<Provider>('anthropic')
  const [savedKey, setSavedKey] = useState<string | null>(null)
  const [key, setKey] = useState('')
  const [changing, setChanging] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  useEffect(() => {
    chrome.storage.sync.get(['apiKey', 'provider'], (r) => {
      if (r.apiKey) setSavedKey(r.apiKey as string)
      if (r.provider) setProvider(r.provider as Provider)
    })
  }, [])

  function keyPrefix(k: string) {
    const dash = k.indexOf('-', k.indexOf('-') + 1)
    return dash > -1 ? k.slice(0, dash + 1) : k.slice(0, 8)
  }

  function keyMasked(k: string) {
    return '•'.repeat(13) + k.slice(-4)
  }

  function save(e: Event) {
    e.preventDefault()
    const trimmed = key.trim()
    if (!trimmed) return

    const isAnthropic = trimmed.startsWith('sk-ant-')
    const isOpenAI = trimmed.startsWith('sk-')
    if ((provider === 'anthropic' && !isAnthropic) || (provider === 'openai' && !isOpenAI)) {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 2500)
      return
    }

    chrome.storage.sync.set({ apiKey: trimmed, provider }, () => {
      setSavedKey(trimmed)
      setChanging(false)
      setKey('')
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    })
  }

  function switchProvider(p: Provider) {
    setProvider(p)
    setKey('')
    setStatus('idle')
    // reload saved key for this provider context
    chrome.storage.sync.get(['apiKey', 'provider'], (r) => {
      if (r.provider === p && r.apiKey) {
        setSavedKey(r.apiKey as string)
        setChanging(false)
      } else {
        setSavedKey(null)
        setChanging(true)
      }
    })
  }

  const current = PROVIDERS.find((p) => p.id === provider)!
  const isActive = !!savedKey

  return (
    <div class="w-80 p-5 bg-[#1a1a1f] text-gray-100">
      <div class="flex items-center gap-2.5 mb-5">
        <span class="text-purple-400 font-bold text-xl tracking-tight">Croma</span>
        <span class={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
          isActive
            ? 'text-green-400 bg-green-950/60 border border-green-700/50'
            : 'text-gray-500 bg-gray-900 border border-gray-700'
        }`}>
          {isActive ? 'Active' : 'Setup needed'}
        </span>
      </div>

      <div class="flex p-1 bg-[#111116] rounded-xl mb-5 border border-[#2a2a32]">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            onClick={() => switchProvider(p.id)}
            class={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              provider === p.id
                ? 'bg-[#2a2a35] text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {savedKey && !changing ? (
        <div class="mb-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-gray-400">{current.label} key</span>
            <span class="text-sm text-green-400 font-medium">✓ Saved</span>
          </div>
          <div class="bg-[#111116] border border-[#2a2a32] rounded-xl px-4 py-3.5">
            <div class="flex items-start justify-between gap-2">
              <div class="font-mono text-sm text-gray-300 leading-relaxed">
                <div>{keyPrefix(savedKey)}</div>
                <div class="text-gray-500 tracking-wider">{keyMasked(savedKey)}</div>
              </div>
              <button
                onClick={() => setChanging(true)}
                class="text-sm text-purple-400 hover:text-purple-300 font-medium shrink-0 mt-0.5 transition-colors"
              >
                Change
              </button>
            </div>
          </div>
          <p class="text-gray-600 text-xs mt-2.5 leading-relaxed">
            Key is saved permanently in Chrome. You never need to re-enter it.
          </p>
        </div>
      ) : (
        <form onSubmit={save} class="flex flex-col gap-3 mb-3">
          {changing && (
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-500">Enter new {current.label} key</span>
              <button
                type="button"
                onClick={() => { setChanging(false); setKey('') }}
                class="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
          <input
            type="password"
            value={key}
            onInput={(e) => setKey((e.target as HTMLInputElement).value)}
            placeholder={current.placeholder}
            autofocus
            class="w-full bg-[#111116] border border-[#2a2a32] rounded-xl px-4 py-3 text-sm font-mono placeholder-gray-700 focus:outline-none focus:border-purple-600/60 text-gray-200 transition-colors"
          />
          {status === 'error' && (
            <p class="text-red-400 text-xs -mt-1">
              Invalid key format for {current.label}
            </p>
          )}
          <button
            type="submit"
            class="py-2.5 bg-purple-700 hover:bg-purple-600 rounded-xl text-sm font-semibold transition-colors"
          >
            {status === 'saved' ? '✓ Saved!' : 'Save Key'}
          </button>
          <p class="text-gray-700 text-xs leading-relaxed">
            Saved once in Chrome sync storage. Never re-enter unless you want to change it.
          </p>
        </form>
      )}
    </div>
  )
}
