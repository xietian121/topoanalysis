/**
 * DeepSeek API 客户端
 * 端点兼容 OpenAI 格式，直接 fetch 调用，无额外依赖
 */

const API_KEY = 'sk-c07b0bd064d148659c12772e5394d788'
const BASE_URL = 'https://api.deepseek.com/v1/chat/completions'
const MODEL = 'deepseek-chat'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface DeepSeekResponse {
  id: string
  choices: { index: number; message: { role: string; content: string } }[]
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}

/**
 * 发送消息给 DeepSeek，返回文本响应
 */
export async function askDeepSeek(
  systemPrompt: string,
  userMessage: string,
  options?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  const { temperature = 0.7, maxTokens = 2048 } = options ?? {}

  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ] as ChatMessage[],
      temperature,
      max_tokens: maxTokens,
      stream: false,
    }),
  })

  if (!res.ok) {
    const errorText = await res.text().catch(() => '')
    throw new Error(`DeepSeek API 错误 (${res.status}): ${errorText}`)
  }

  const data: DeepSeekResponse = await res.json()
  return data.choices[0]?.message?.content ?? ''
}

/**
 * 流式调用 DeepSeek，通过回调逐步返回内容
 */
export async function askDeepSeekStream(
  systemPrompt: string,
  userMessage: string,
  onChunk: (text: string) => void,
  options?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  const { temperature = 0.7, maxTokens = 2048 } = options ?? {}

  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ] as ChatMessage[],
      temperature,
      max_tokens: maxTokens,
      stream: true,
    }),
  })

  if (!res.ok) {
    const errorText = await res.text().catch(() => '')
    throw new Error(`DeepSeek API 流式错误 (${res.status}): ${errorText}`)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('无法读取响应流')

  const decoder = new TextDecoder()
  let fullText = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data: ')) continue
      const jsonStr = trimmed.slice(6)
      if (jsonStr === '[DONE]') continue

      try {
        const chunk = JSON.parse(jsonStr)
        const delta = chunk.choices?.[0]?.delta?.content
        if (delta) {
          fullText += delta
          onChunk(delta)
        }
      } catch {
        // 跳过无法解析的 chunk
      }
    }
  }

  return fullText
}
