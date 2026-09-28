/**
 * Network simulation for the mock backend: how slow and how unreliable the fake API is.
 *
 * Edit this file to try the app under different conditions:
 * - switch ACTIVE_PROFILE (or run with VITE_MOCK_PROFILE=slow pnpm dev), or
 * - add ROUTE_RULES to make one endpoint slow or failing without touching the others.
 *
 * Tests always use the `instant` profile with no route rules, so nothing here affects them.
 */

export interface SimulationProfile {
  /** Base delay added to every API response, in milliseconds. */
  latencyMs: number
  /** Extra random delay, from 0 up to this many milliseconds. */
  jitterMs: number
  /** Share of requests (0–1) that fail with a 503 before reaching the handler. */
  failureRate: number
}

export interface RouteRule extends Partial<SimulationProfile> {
  /** HTTP method, or '*' for any. */
  method: string
  /** Path after the API base URL. `:name` matches one segment, e.g. '/questions/:id'. */
  path: string
  /** Status for simulated failures on this route (default 503). */
  status?: number
}

export const PROFILES = {
  /** No delay, no failures. Used by tests. */
  instant: { latencyMs: 0, jitterMs: 0, failureRate: 0 },
  /** Default: short enough to work comfortably, long enough to see loading states. */
  normal: { latencyMs: 300, jitterMs: 0, failureRate: 0 },
  /** A slow connection: loading states and disabled buttons stay on screen. */
  slow: { latencyMs: 1500, jitterMs: 1000, failureRate: 0 },
  /** Mostly works, but one request in five fails: exercises error and retry paths. */
  flaky: { latencyMs: 400, jitterMs: 600, failureRate: 0.2 },
  /** Every request fails. */
  down: { latencyMs: 300, jitterMs: 0, failureRate: 1 },
} satisfies Record<string, SimulationProfile>

export type ProfileName = keyof typeof PROFILES

/** The profile used in the running app. */
export const ACTIVE_PROFILE: ProfileName = 'normal'

/**
 * Per-endpoint overrides, applied on top of the active profile. The first matching rule wins.
 * Examples:
 *   { method: 'GET', path: '/structures', latencyMs: 3000 },
 *   { method: 'POST', path: '/questions/:id/share', failureRate: 1 },
 *   { method: '*', path: '/shared/:shareId', failureRate: 0.5, status: 500 },
 */
export const ROUTE_RULES: RouteRule[] = []

export interface SimulationConfig {
  profile: SimulationProfile
  rules: RouteRule[]
}

function isProfileName(name: string | undefined): name is ProfileName {
  return name !== undefined && Object.prototype.hasOwnProperty.call(PROFILES, name)
}

export function resolveConfig(
  mode: string = import.meta.env.MODE,
  envProfile: string | undefined = import.meta.env.VITE_MOCK_PROFILE,
): SimulationConfig {
  if (mode === 'test') return { profile: PROFILES.instant, rules: [] }
  const name = isProfileName(envProfile) ? envProfile : ACTIVE_PROFILE
  return { profile: PROFILES[name], rules: ROUTE_RULES }
}

function pathPattern(path: string): RegExp {
  const escaped = path
    .replace(/\/+$/, '')
    .split('/')
    .map((part) => (part.startsWith(':') ? '[^/]+' : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    .join('/')
  return new RegExp(`^${escaped}/?$`)
}

export interface SimulationOutcome {
  delayMs: number
  /** Set when the request should fail instead of reaching its handler. */
  failStatus: number | null
}

/**
 * Decides how to treat one request. `path` is relative to the API base URL.
 * `random` is injectable so tests can make the outcome deterministic.
 */
export function simulate(
  config: SimulationConfig,
  method: string,
  path: string,
  random: () => number = Math.random,
): SimulationOutcome {
  const rule = config.rules.find(
    (r) =>
      (r.method === '*' || r.method.toUpperCase() === method.toUpperCase()) &&
      pathPattern(r.path).test(path),
  )
  const latencyMs = rule?.latencyMs ?? config.profile.latencyMs
  const jitterMs = rule?.jitterMs ?? config.profile.jitterMs
  const failureRate = rule?.failureRate ?? config.profile.failureRate
  const delayMs = latencyMs + (jitterMs > 0 ? Math.round(random() * jitterMs) : 0)
  const fails = failureRate > 0 && random() < failureRate
  return { delayMs, failStatus: fails ? (rule?.status ?? 503) : null }
}
