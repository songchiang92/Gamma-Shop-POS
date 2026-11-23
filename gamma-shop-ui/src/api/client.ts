export const BASE_URL = 'http://localhost:8080'

const ACCESS_KEY = 'gamma.accessToken'
const REFRESH_KEY = 'gamma.refreshToken'
const GUEST_KEY = 'gamma.guestToken'
const TOUCH_KEY = 'gamma.sessionTouch'

/**
 * How long a closed/idle session can be restored on reopen before the user must log
 * in again. Matches the API refresh-token lifetime (app.jwt.refresh-token-days: 7) -
 * within this window the client silently refreshes the access token on the first 401.
 */
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY)
}
export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY)
}
export function getGuestToken() {
  return localStorage.getItem(GUEST_KEY)
}
/** Marks the session as "recently active" - call on login and periodically while the app is open. */
export function touchSession() {
  localStorage.setItem(TOUCH_KEY, String(Date.now()))
}
/** True if the session was touched within the last SESSION_TTL_MS (e.g. tab closed and reopened quickly). */
export function isSessionFresh() {
  const touched = localStorage.getItem(TOUCH_KEY)
  if (!touched) return false
  return Date.now() - Number(touched) < SESSION_TTL_MS
}
export function setSession(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_KEY, accessToken)
  localStorage.setItem(REFRESH_KEY, refreshToken)
  touchSession()
}
export function setGuestToken(token: string) {
  localStorage.setItem(GUEST_KEY, token)
}
export function clearGuestToken() {
  localStorage.removeItem(GUEST_KEY)
}
export function clearSession() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(TOUCH_KEY)
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false
  try {
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) {
      clearSession()
      return false
    }
    const data = await res.json()
    setSession(data.accessToken, data.refreshToken)
    return true
  } catch {
    return false
  }
}

interface RequestOptions {
  method?: string
  body?: unknown
  isForm?: boolean
  asBlob?: boolean
}

async function request<T>(path: string, options: RequestOptions = {}, retry = true): Promise<T> {
  const headers = new Headers()
  const token = getAccessToken()
  const guestToken = getGuestToken()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  } else if (guestToken) {
    headers.set('X-Guest-Token', guestToken)
  }

  let body: BodyInit | undefined
  if (options.body !== undefined) {
    if (options.isForm) {
      body = options.body as FormData
    } else {
      headers.set('Content-Type', 'application/json')
      body = JSON.stringify(options.body)
    }
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body,
  })

  if (res.status === 401 && retry && token) {
    const refreshed = await tryRefresh()
    if (refreshed) return request<T>(path, options, false)
  }

  if (!res.ok) {
    let message = res.statusText || `Request failed (${res.status})`
    try {
      const data = await res.clone().json()
      message = data.message || data.error || message
    } catch {
      // response wasn't JSON, fall back to status text
    }
    throw new ApiError(message, res.status)
  }

  if (res.status === 204) return undefined as T
  if (options.asBlob) return (await res.blob()) as T

  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return (await res.json()) as T
  }
  return undefined as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body ?? {} }),
  postNoBody: <T>(path: string) => request<T>(path, { method: 'POST' }),
  postForm: <T>(path: string, form: FormData) => request<T>(path, { method: 'POST', body: form, isForm: true }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  getBlob: (path: string) => request<Blob>(path, { asBlob: true }),
}

/** After login, merge whatever is in the guest cart into the freshly authenticated user's cart. */
export async function mergeGuestCartIfAny() {
  const guestToken = getGuestToken()
  const accessToken = getAccessToken()
  if (!guestToken || !accessToken) return
  try {
    await fetch(`${BASE_URL}/api/cart/merge`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'X-Guest-Token': guestToken },
    })
  } finally {
    clearGuestToken()
  }
}

export function imageUrl(path: string) {
  return `${BASE_URL}${path}`
}

export function money(value: string | number, currency = 'MYR') {
  const n = typeof value === 'string' ? Number(value) : value
  return `${currency} ${n.toFixed(2)}`
}
