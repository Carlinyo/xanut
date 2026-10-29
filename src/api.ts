// Единая точка общения с бэкендом. Для другого домена API задайте VITE_API_URL в .env
const BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? '') + '/api'
const TIMEOUT_MS = 15_000 // сервер не ответил — не держим кнопки и экран загрузки вечно

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public issues?: { path: string; message: string }[],
    /** Остальные поля ответа (например, retryIn у OTP_COOLDOWN). */
    public details: Record<string, unknown> = {},
  ) {
    super(code)
  }
}

export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown; timeout?: number } = {}): Promise<T> {
  const hasBody = opts.body !== undefined
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), opts.timeout ?? TIMEOUT_MS)
  let res: Response
  try {
    res = await fetch(BASE + path, {
      method: opts.method ?? 'GET',
      credentials: 'include',
      headers: hasBody ? { 'content-type': 'application/json' } : undefined,
      body: hasBody ? JSON.stringify(opts.body) : undefined,
      signal: ctrl.signal,
    })
  } catch {
    throw new ApiError(0, 'NETWORK')
  } finally {
    clearTimeout(timer)
  }
  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const body = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>
    let code = typeof body.error === 'string' ? body.error : 'ERROR'
    // общий лимит запросов (fastify-rate-limit) отвечает 429 с error: 'Too Many Requests' — приводим к своему коду
    if (res.status === 429 && !/^[A-Z_]+$/.test(code)) code = 'RATE_LIMIT'
    throw new ApiError(res.status, code, Array.isArray(body.issues) ? body.issues : undefined, body)
  }
  return data as T
}

/** Ключ текста для ошибок, общих для всех форм: нет связи, слишком много попыток, прочее. */
export function commonErrorKey(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === 'NETWORK') return 'errors.network'
    if (e.status === 429) return 'errors.tooMany'
  }
  return 'errors.generic'
}
