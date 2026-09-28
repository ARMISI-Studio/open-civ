import { describe, it, expect } from 'vitest'
import { listStructures } from '@/api/structures'
import { PROFILES, resolveConfig, simulate, type SimulationConfig } from '../simulation'

const config = (rules: SimulationConfig['rules'] = []): SimulationConfig => ({
  profile: { latencyMs: 100, jitterMs: 50, failureRate: 0.25 },
  rules,
})

describe('mock network simulation', () => {
  it('always uses the instant profile in tests', () => {
    expect(resolveConfig('test', 'down')).toEqual({ profile: PROFILES.instant, rules: [] })
  })

  it('picks the profile from VITE_MOCK_PROFILE and ignores unknown names', () => {
    expect(resolveConfig('development', 'slow').profile).toBe(PROFILES.slow)
    expect(resolveConfig('development', 'nope').profile).toBe(PROFILES.normal)
  })

  it('adds jitter to the latency and fails at the given rate', () => {
    expect(simulate(config(), 'GET', '/structures', () => 0.5)).toEqual({
      delayMs: 125,
      failStatus: null,
    })
    expect(simulate(config(), 'GET', '/structures', () => 0.1).failStatus).toBe(503)
  })

  it('applies the first matching route rule on top of the profile', () => {
    const rules = [
      { method: 'POST', path: '/questions/:id/share', failureRate: 1, status: 500 },
      { method: '*', path: '/questions/:id', latencyMs: 2000, jitterMs: 0 },
    ]
    expect(simulate(config(rules), 'post', '/questions/q_1/share', () => 0.9)).toEqual({
      delayMs: 145,
      failStatus: 500,
    })
    expect(simulate(config(rules), 'PUT', '/questions/q_1', () => 0.9)).toEqual({
      delayMs: 2000,
      failStatus: null,
    })
    // `:id` matches one segment only; unmatched paths use the profile.
    expect(simulate(config(rules), 'GET', '/questions', () => 0.9).delayMs).toBe(145)
  })

  it('hands requests on to the mock handlers when nothing is simulated', async () => {
    expect((await listStructures()).length).toBeGreaterThan(0)
  })
})
