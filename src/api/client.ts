/**
 * Minimal JSON client for the backend API. Every API module goes through `apiRequest`,
 * so the base URL and the error format are defined in one place.
 */

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '')

/** Error body returned by the API for any non-2xx response. */
export interface ApiErrorBody {
  error: {
    code: string
    message: string
    /** Validation messages keyed by field name. */
    fields?: Record<string, string>
  }
}

export class ApiError extends Error {
  override name = 'ApiError'

  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields: Record<string, string> = {},
  ) {
    super(message)
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal } = options
  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin)
  let response: Response
  try {
    response = await fetch(url, {
      method,
      signal,
      headers:
        body === undefined
          ? { Accept: 'application/json' }
          : { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error
    throw new ApiError(
      0,
      'network_error',
      'Could not reach the server. Check your connection and try again.',
    )
  }

  if (response.status === 204) return undefined as T
  const data: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const error = (data as Partial<ApiErrorBody> | null)?.error
    throw new ApiError(
      response.status,
      error?.code ?? 'http_error',
      error?.message ?? `The server returned an error (${response.status}).`,
      error?.fields ?? {},
    )
  }
  return data as T
}

/** A readable message for any error thrown while calling the API. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return 'Something went wrong. Please try again.'
}
