import { describe, it, expect } from 'vitest'
import {
  type StructureDraft,
  describeElement,
  memberLength,
  nextElementId,
  nextNodeLabel,
  snapToGrid,
  validateStructure,
} from '../structures'

function beam(): StructureDraft {
  return {
    name: 'Beam',
    nodes: [
      { id: 'n1', label: 'A', x: 0, y: 0 },
      { id: 'n2', label: 'B', x: 6, y: 0 },
    ],
    members: [{ id: 'm1', startNodeId: 'n1', endNodeId: 'n2' }],
    supports: [
      { id: 's1', nodeId: 'n1', type: 'pin' },
      { id: 's2', nodeId: 'n2', type: 'roller' },
    ],
    loads: [{ id: 'l1', nodeId: 'n2', fx: 0, fy: -10 }],
  }
}

function messages(s: StructureDraft) {
  return validateStructure(s).map((i) => i.message)
}

describe('validateStructure', () => {
  it('accepts a simple supported beam', () => {
    expect(validateStructure(beam())).toEqual([])
  })

  it('requires a name within the length limit', () => {
    const s = beam()
    s.name = '   '
    expect(validateStructure(s)).toContainEqual({
      field: 'name',
      message: 'Enter a name for the structure.',
    })
    s.name = 'x'.repeat(81)
    expect(validateStructure(s)[0]?.field).toBe('name')
  })

  it('requires at least one member', () => {
    const s = beam()
    s.members = []
    expect(messages(s)).toContain('Add at least one member.')
  })

  it('flags nodes on top of each other, blank and duplicate labels', () => {
    const s = beam()
    s.nodes.push({ id: 'n3', label: 'A', x: 6, y: 0 })
    s.members.push({ id: 'm2', startNodeId: 'n1', endNodeId: 'n3' })
    const m = messages(s)
    expect(m).toContain('Node A is on top of node B.')
    expect(m).toContain('The label A is used by 2 nodes.')
    s.nodes[2]!.label = ' '
    expect(messages(s)).toContain('A node has no label.')
  })

  it('flags unconnected nodes and invalid positions', () => {
    const s = beam()
    s.nodes.push({ id: 'n3', label: 'C', x: 3, y: 2 })
    s.nodes.push({ id: 'n4', label: 'D', x: Number.NaN, y: 0 })
    const m = messages(s)
    expect(m).toContain('Node C is not connected to any member.')
    expect(m).toContain('Node D has an invalid position.')
    const issue = validateStructure(s).find((i) => i.message.startsWith('Node C'))
    expect(issue?.element).toEqual({ kind: 'node', id: 'n3' })
  })

  it('flags members with missing nodes, zero length, and duplicates', () => {
    const s = beam()
    s.members.push({ id: 'm2', startNodeId: 'n2', endNodeId: 'n1' })
    s.members.push({ id: 'm3', startNodeId: 'n1', endNodeId: 'n1' })
    s.members.push({ id: 'm4', startNodeId: 'n1', endNodeId: 'n9' })
    const m = messages(s)
    expect(m).toContain('Member B–A is a duplicate.')
    expect(m).toContain('Member A–A has zero length.')
    expect(m).toContain('A member is missing one of its nodes.')
  })

  it('flags supports on missing nodes, unknown types, and double supports', () => {
    const s = beam()
    s.supports.push({ id: 's3', nodeId: 'n1', type: 'roller' })
    s.supports.push({ id: 's4', nodeId: 'n9', type: 'pin' })
    s.supports.push({ id: 's5', nodeId: 'n2', type: 'hinge' as never })
    const m = messages(s)
    expect(m).toContain('Node A has more than one support.')
    expect(m).toContain('A support is attached to a missing node.')
    expect(m.some((x) => x.includes('has an unknown type'))).toBe(true)
  })

  it('flags loads with zero or invalid force and missing nodes', () => {
    const s = beam()
    s.loads.push({ id: 'l2', nodeId: 'n1', fx: 0, fy: 0 })
    s.loads.push({ id: 'l3', nodeId: 'n1', fx: Number.POSITIVE_INFINITY, fy: 0 })
    s.loads.push({ id: 'l4', nodeId: 'n9', fx: 1, fy: 0 })
    const m = messages(s)
    expect(m).toContain('Load at A has zero force.')
    expect(m).toContain('Load at A has an invalid force.')
    expect(m).toContain('A load is applied to a missing node.')
  })
})

describe('structure helpers', () => {
  it('snaps to the 0.5 m grid without -0 or float noise', () => {
    expect(snapToGrid(1.24)).toBe(1)
    expect(snapToGrid(1.26)).toBe(1.5)
    expect(Object.is(snapToGrid(-0.1), 0)).toBe(true)
    expect(snapToGrid(2.4999999)).toBe(2.5)
  })

  it('computes member length in metres', () => {
    const s = beam()
    s.nodes[1] = { id: 'n2', label: 'B', x: 3, y: 4 }
    expect(memberLength(s, s.members[0]!)).toBe(5)
    expect(memberLength(s, { id: 'x', startNodeId: 'n1', endNodeId: 'zz' })).toBeNull()
  })

  it('generates the next free node label and element id', () => {
    expect(nextNodeLabel([])).toBe('A')
    expect(
      nextNodeLabel([
        { id: 'a', label: 'A', x: 0, y: 0 },
        { id: 'c', label: 'C', x: 1, y: 0 },
      ]),
    ).toBe('B')
    const many = Array.from({ length: 26 }, (_, i) => ({
      id: `n${i}`,
      label: String.fromCharCode(65 + i),
      x: i,
      y: 0,
    }))
    expect(nextNodeLabel(many)).toBe('AA')
    expect(nextElementId('n', [{ id: 'n1' }, { id: 'n7' }, { id: 'x9' }])).toBe('n8')
    expect(nextElementId('m', [])).toBe('m1')
  })

  it('describes elements for labels and messages', () => {
    const s = beam()
    expect(describeElement(s, { kind: 'node', id: 'n1' })).toBe('Node A')
    expect(describeElement(s, { kind: 'member', id: 'm1' })).toBe('Member A–B')
    expect(describeElement(s, { kind: 'support', id: 's2' })).toBe('Roller support at B')
    expect(describeElement(s, { kind: 'load', id: 'l1' })).toBe('Load at B')
  })
})
