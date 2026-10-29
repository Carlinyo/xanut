// Единая точка общения с бэкендом. Для другого домена API задайте VITE_API_URL в .env
const BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? '') + '/api'

export class ApiError extends Error {
  constructor(public status: number, public code: string, public issues?: { path: string; message: string }[]) {
    super(code)
  }
}

export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const hasBody = opts.body !== undefined
  let res: Response
  try {
    res = await fetch(BASE + path, {
      method: opts.method ?? 'GET',
      credentials: 'include',
      headers: hasBody ? { 'content-type': 'application/json' } : undefined,
      body: hasBody ? JSON.stringify(opts.body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'NETWORK')
  }
  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'ERROR', data.issues)
  return data as T
}
