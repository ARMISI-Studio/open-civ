/**
 * Worked examples for frame2d.ts. Each expected value comes from a textbook formula
 * that can be checked by hand. With DEFAULT_SECTION:
 *   EI = 200e6 kN/m² × 8356e-8 m⁴ = 16 712 kN·m²
 *   EA = 200e6 kN/m² × 53.8e-4 m² = 1 076 000 kN
 */
import { describe, it, expect } from 'vitest'
import type { StructureDraft, SupportType } from '@/domain/structures'
import {
  DEFAULT_SECTION,
  analyzeStructure,
  deflectedMember,
  maxDisplacement,
  type AnalysisResult,
} from '../frame2d'

const EI = DEFAULT_SECTION.E * DEFAULT_SECTION.I
const EA = DEFAULT_SECTION.E * DEFAULT_SECTION.A

type Solved = Extract<AnalysisResult, { status: 'solved' }>

function structure(
  nodes: [string, number, number][],
  members: [string, string][],
  supports: [string, SupportType][],
  loads: [string, number, number][],
): StructureDraft {
  return {
    name: 'Test',
    nodes: nodes.map(([id, x, y]) => ({ id, label: id, x, y })),
    members: members.map(([a, b], i) => ({ id: `m${i + 1}`, startNodeId: a, endNodeId: b })),
    supports: supports.map(([nodeId, type], i) => ({ id: `s${i + 1}`, nodeId, type })),
    loads: loads.map(([nodeId, fx, fy], i) => ({ id: `l${i + 1}`, nodeId, fx, fy })),
  }
}

function solved(s: StructureDraft): Solved {
  const result = analyzeStructure(s)
  if (result.status !== 'solved') throw new Error(`Expected a solution, got: ${result.message}`)
  return result
}

const reaction = (r: Solved, nodeId: string) => r.reactions.find((x) => x.nodeId === nodeId)!
const displacement = (r: Solved, nodeId: string) =>
  r.displacements.find((x) => x.nodeId === nodeId)!
const forces = (r: Solved, memberId: string) => r.memberForces.find((x) => x.memberId === memberId)!

describe('frame2d: simply supported beam, central point load', () => {
  // A (pin) ── B ── C (roller), span L = 6 m, P = 10 kN down at B.
  const L = 6
  const P = 10
  const beam = structure(
    [
      ['A', 0, 0],
      ['B', 3, 0],
      ['C', 6, 0],
    ],
    [
      ['A', 'B'],
      ['B', 'C'],
    ],
    [
      ['A', 'pin'],
      ['C', 'roller'],
    ],
    [['B', 0, -P]],
  )
  const r = solved(beam)

  it('reactions are P/2 at each support, with no horizontal reaction', () => {
    expect(reaction(r, 'A')).toMatchObject({ rx: 0, mz: 0 })
    expect(reaction(r, 'A').ry).toBeCloseTo(P / 2, 9)
    expect(reaction(r, 'C').ry).toBeCloseTo(P / 2, 9)
    expect(reaction(r, 'C').rx).toBe(0)
  })

  it('midspan moment is PL/4 (sagging) and shear is ±P/2', () => {
    const ab = forces(r, 'm1')
    const bc = forces(r, 'm2')
    expect(ab.start.M).toBeCloseTo(0, 9)
    expect(ab.end.M).toBeCloseTo((P * L) / 4, 9)
    expect(bc.start.M).toBeCloseTo((P * L) / 4, 9)
    expect(bc.end.M).toBeCloseTo(0, 9)
    expect(ab.start.V).toBeCloseTo(P / 2, 9)
    expect(bc.start.V).toBeCloseTo(-P / 2, 9)
    expect(ab.start.N).toBeCloseTo(0, 9)
  })

  it('midspan deflection is PL³ / 48EI and end rotation is PL² / 16EI', () => {
    expect(displacement(r, 'B').uy).toBeCloseTo(-(P * L ** 3) / (48 * EI), 12)
    expect(displacement(r, 'A').rz).toBeCloseTo(-(P * L ** 2) / (16 * EI), 12)
    expect(displacement(r, 'C').rz).toBeCloseTo((P * L ** 2) / (16 * EI), 12)
    expect(maxDisplacement(beam, r)).toBeCloseTo((P * L ** 3) / (48 * EI), 12)
  })

  it('drawing a member the other way flips the sign of M (tension side is relative to direction)', () => {
    const reversed = {
      ...beam,
      members: [beam.members[0]!, { ...beam.members[1]!, startNodeId: 'C', endNodeId: 'B' }],
    }
    const cb = forces(solved(reversed), 'm2')
    expect(cb.end.M).toBeCloseTo(-(P * L) / 4, 9)
  })
})

describe('frame2d: cantilever with a tip load', () => {
  // A (fixed) ── B, L = 3 m, P = 5 kN down at B.
  const L = 3
  const P = 5
  const cantilever = structure(
    [
      ['A', 0, 0],
      ['B', 3, 0],
    ],
    [['A', 'B']],
    [['A', 'fixed']],
    [['B', 0, -P]],
  )
  const r = solved(cantilever)

  it('the support carries P up and a counter-clockwise moment PL', () => {
    expect(reaction(r, 'A').rx).toBeCloseTo(0, 9)
    expect(reaction(r, 'A').ry).toBeCloseTo(P, 9)
    expect(reaction(r, 'A').mz).toBeCloseTo(P * L, 9)
  })

  it('the moment is −PL (hogging) at the support and zero at the tip', () => {
    expect(forces(r, 'm1').start.M).toBeCloseTo(-P * L, 9)
    expect(forces(r, 'm1').end.M).toBeCloseTo(0, 9)
    expect(forces(r, 'm1').start.V).toBeCloseTo(P, 9)
  })

  it('tip deflection is PL³ / 3EI and tip rotation is PL² / 2EI', () => {
    expect(displacement(r, 'B').uy).toBeCloseTo(-(P * L ** 3) / (3 * EI), 12)
    expect(displacement(r, 'B').rz).toBeCloseTo(-(P * L ** 2) / (2 * EI), 12)
  })

  it('the deflected shape follows v(x) = Px²(3L − x) / 6EI', () => {
    const points = deflectedMember(cantilever, r, 'm1', 1, 4)
    const x = 1.5 // point 2 of 4
    expect(points[2]!.x).toBeCloseTo(x, 9)
    expect(points[2]!.y).toBeCloseTo(-(P * x ** 2 * (3 * L - x)) / (6 * EI), 12)
  })
})

describe('frame2d: axial bar', () => {
  // A (pin) ── B (roller), L = 4 m, P = 20 kN pulling right at B.
  it('carries tension P and stretches by PL / EA', () => {
    const r = solved(
      structure(
        [
          ['A', 0, 0],
          ['B', 4, 0],
        ],
        [['A', 'B']],
        [
          ['A', 'pin'],
          ['B', 'roller'],
        ],
        [['B', 20, 0]],
      ),
    )
    expect(reaction(r, 'A').rx).toBeCloseTo(-20, 9)
    expect(forces(r, 'm1').start.N).toBeCloseTo(20, 9)
    expect(forces(r, 'm1').end.N).toBeCloseTo(20, 9)
    expect(displacement(r, 'B').ux).toBeCloseTo((20 * 4) / EA, 12)
  })
})

describe('frame2d: propped cantilever (statically indeterminate)', () => {
  // A (fixed) ── B ── C (roller), L = 6 m, P = 16 kN down at midspan B.
  // Standard results: R_C = 5P/16, R_A = 11P/16, M_A = 3PL/16, moment under the load 5PL/32.
  const L = 6
  const P = 16
  const r = solved(
    structure(
      [
        ['A', 0, 0],
        ['B', 3, 0],
        ['C', 6, 0],
      ],
      [
        ['A', 'B'],
        ['B', 'C'],
      ],
      [
        ['A', 'fixed'],
        ['C', 'roller'],
      ],
      [['B', 0, -P]],
    ),
  )

  it('matches the textbook reactions and moments', () => {
    expect(reaction(r, 'C').ry).toBeCloseTo((5 * P) / 16, 9)
    expect(reaction(r, 'A').ry).toBeCloseTo((11 * P) / 16, 9)
    expect(reaction(r, 'A').mz).toBeCloseTo((3 * P * L) / 16, 9)
    expect(forces(r, 'm1').start.M).toBeCloseTo(-(3 * P * L) / 16, 9)
    expect(forces(r, 'm1').end.M).toBeCloseTo((5 * P * L) / 32, 9)
  })
})

describe('frame2d: portal frame', () => {
  // A (fixed, 0,0) ┃ B (0,4) ━━ C (6,4) ┃ D (pin, 6,0); 10 kN right at B, 20 kN down at C.
  const r = solved(
    structure(
      [
        ['A', 0, 0],
        ['B', 0, 4],
        ['C', 6, 4],
        ['D', 6, 0],
      ],
      [
        ['A', 'B'],
        ['B', 'C'],
        ['C', 'D'],
      ],
      [
        ['A', 'fixed'],
        ['D', 'pin'],
      ],
      [
        ['B', 10, 0],
        ['C', 0, -20],
      ],
    ),
  )

  it('reactions balance the loads (ΣFx = 0, ΣFy = 0, ΣM about A = 0)', () => {
    const a = reaction(r, 'A')
    const d = reaction(r, 'D')
    expect(a.rx + d.rx + 10).toBeCloseTo(0, 9)
    expect(a.ry + d.ry - 20).toBeCloseTo(0, 9)
    // Moments about A (counter-clockwise positive): M = x·Fy − y·Fx.
    const loadMoment = -4 * 10 + 6 * -20
    const reactionMoment = a.mz + d.mz + 6 * d.ry
    expect(loadMoment + reactionMoment).toBeCloseTo(0, 9)
  })

  it('moments are continuous through the rigid joint at B', () => {
    // At a rigid two-member joint with no applied moment, the end moments of the two
    // members have equal size.
    expect(Math.abs(forces(r, 'm1').end.M)).toBeCloseTo(Math.abs(forces(r, 'm2').start.M), 9)
  })
})

describe('frame2d: unstable and invalid structures', () => {
  const beam = (supports: [string, SupportType][]) =>
    structure(
      [
        ['A', 0, 0],
        ['B', 4, 0],
      ],
      [['A', 'B']],
      supports,
      [['B', 0, -10]],
    )

  it.each([
    ['no supports', []],
    ['a single pin (free to rotate)', [['A', 'pin']]],
    [
      'two rollers (free to slide sideways)',
      [
        ['A', 'roller'],
        ['B', 'roller'],
      ],
    ],
  ] as [string, [string, SupportType][]][])('reports %s as unstable', (_, supports) => {
    expect(analyzeStructure(beam(supports)).status).toBe('unstable')
  })

  it('rejects structures the matrices cannot describe', () => {
    const loose = beam([['A', 'fixed']])
    loose.nodes.push({ id: 'Z', label: 'Z', x: 9, y: 9 })
    expect(analyzeStructure(loose)).toEqual({
      status: 'invalid',
      message: 'Node Z is not connected to any member.',
    })
    expect(analyzeStructure({ ...loose, members: [] }).status).toBe('invalid')
  })

  it('gives zero results when there are no loads', () => {
    const r = solved({ ...beam([['A', 'fixed']]), loads: [] })
    expect(reaction(r, 'A')).toMatchObject({ rx: 0, ry: 0, mz: 0 })
    expect(maxDisplacement(beam([['A', 'fixed']]), r)).toBe(0)
  })
})
