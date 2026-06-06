export type Feature = 'code-explain' | 'error-fix' | 'docs-ai' | 'network-explain'

export type Provider = 'anthropic' | 'openai'

export type BgMessage =
  | { type: 'ASK_CLAUDE'; prompt: string; feature: Feature; context?: string }
  | { type: 'SAVE_CONFIG'; key: string; provider: Provider }
  | { type: 'GET_CONFIG' }

export type BgResponse =
  | { type: 'CHUNK'; text: string }
  | { type: 'DONE' }
  | { type: 'ERROR'; message: string }
  | { type: 'CONFIG'; key: string | null; provider: Provider }
  | { type: 'SAVED' }

export const FEATURE_LABELS: Record<Feature, string> = {
  'code-explain': 'Code Explain',
  'error-fix': 'Error Fix',
  'docs-ai': 'Docs AI',
  'network-explain': 'Network',
}

export const SYSTEM_PROMPTS: Record<Feature, string> = {
  'code-explain': 'You are a senior developer. Explain the code clearly in plain English. Use this exact format:\n1. A short explanation of each key part\n2. End with a section called "→ What this does in practice:" — one or two sentences describing the real-world role this code plays in the app (what feature it powers, what problem it solves). Be concise.',
  'error-fix': 'You are a debugging expert. Analyze the error and give: 1) Root cause 2) Exact fix with corrected code. Be direct.',
  'docs-ai': 'You are a documentation assistant. Answer the question based ONLY on the provided page content. Do not use outside knowledge. Be concise.',
  'network-explain': 'You are an API debugging expert. Analyze the network request and explain what went wrong and exactly how to fix it.',
}
