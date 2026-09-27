import { describe, it, expect } from 'vitest'
import { useStructureEditor } from '../useStructureEditor'

function buildBeam() {
  const e = useStructureEditor()
  e.updateDetails({ name: 'Beam' })
  e.setTool('node')
  e.canvasClick(0.1, -0.1)
  e.canvasClick(5.9, 0.2)
  return e
}

describe('useStructureEditor', () => {
  it('adds snapped nodes with the node tool and selects them', () => {
    const e = buildBeam()
    expect(e.structure.value.nodes).toEqual([
      { id: 'n1', label: 'A', x: 0, y: 0 },
      { id: 'n2', label: 'B', x: 6, y: 0 },
    ])
    expect(e.selection.value).toEqual({ kind: 'node', id: 'n2' })
  })

  it('does not duplicate a node at the same snapped position', () => {
    const e = buildBeam()
    e.canvasClick(6.1, 0.1)
    expect(e.structure.value.nodes).toHaveLength(2)
  })

  it('connects two nodes with the member tool and chains from the end node', () => {
    const e = buildBeam()
    e.setTool('member')
    e.elementClick({ kind: 'node', id: 'n1' })
    expect(e.pendingMemberStart.value).toBe('n1')
    e.elementClick({ kind: 'node', id: 'n2' })
    expect(e.structure.value.members).toEqual([{ id: 'm1', startNodeId: 'n1', endNodeId: 'n2' }])
    expect(e.selection.value).toEqual({ kind: 'member', id: 'm1' })
    expect(e.pendingMemberStart.value).toBe('n2')
    // Clicking empty grid creates the next node and member.
    e.canvasClick(6, 3)
    expect(e.structure.value.nodes).toHaveLength(3)
    expect(e.structure.value.members[1]).toMatchObject({ startNodeId: 'n2', endNodeId: 'n3' })
    e.cancel()
    expect(e.pendingMemberStart.value).toBeNull()
  })

  it('never creates duplicate or zero-length members', () => {
    const e = buildBeam()
    expect(e.addMember('n1', 'n1')).toBeNull()
    const first = e.addMember('n1', 'n2')
    expect(e.addMember('n2', 'n1')).toEqual(first)
    expect(e.structure.value.members).toHaveLength(1)
  })

  it('adds one support per node and loads with the default force', () => {
    const e = buildBeam()
    e.setTool('support')
    e.elementClick({ kind: 'node', id: 'n1' })
    e.elementClick({ kind: 'node', id: 'n1' })
    expect(e.structure.value.supports).toEqual([{ id: 's1', nodeId: 'n1', type: 'pin' }])
    expect(e.selection.value).toEqual({ kind: 'support', id: 's1' })
    e.setTool('load')
    e.elementClick({ kind: 'node', id: 'n2' })
    expect(e.structure.value.loads).toEqual([{ id: 'l1', nodeId: 'n2', fx: 0, fy: -10 }])
  })

  it('selects elements with the select tool and clears selection on the background', () => {
    const e = buildBeam()
    e.setTool('select')
    e.elementClick({ kind: 'node', id: 'n1' })
    expect(e.selectedNode.value?.label).toBe('A')
    e.canvasClick(3, 3)
    expect(e.selection.value).toBeNull()
    e.select({ kind: 'node', id: 'missing' })
    expect(e.selection.value).toBeNull()
  })

  it('edits properties and moves nodes on the grid', () => {
    const e = buildBeam()
    e.updateNode('n1', { label: 'P' })
    e.moveNode('n1', 1.2, 0.9)
    expect(e.structure.value.nodes[0]).toEqual({ id: 'n1', label: 'P', x: 1, y: 1 })
    e.addSupport('n1')
    e.updateSupport('s1', { type: 'fixed' })
    e.addLoad('n2')
    e.updateLoad('l1', { fx: 5 })
    e.addMember('n1', 'n2')
    e.updateMember('m1', { label: 'Beam' })
    expect(e.structure.value.supports[0]!.type).toBe('fixed')
    expect(e.structure.value.loads[0]).toMatchObject({ fx: 5, fy: -10 })
    expect(e.structure.value.members[0]!.label).toBe('Beam')
  })

  it('deleting a node cascades to its members, supports, and loads', () => {
    const e = buildBeam()
    e.addMember('n1', 'n2')
    e.addSupport('n1')
    e.addLoad('n1')
    e.addLoad('n2')
    e.select({ kind: 'node', id: 'n1' })
    e.deleteSelected()
    const s = e.structure.value
    expect(s.nodes.map((n) => n.id)).toEqual(['n2'])
    expect(s.members).toEqual([])
    expect(s.supports).toEqual([])
    expect(s.loads).toEqual([{ id: 'l2', nodeId: 'n2', fx: 0, fy: -10 }])
    expect(e.selection.value).toBeNull()
  })

  it('undoes and redoes changes, restoring deleted elements', () => {
    const e = buildBeam()
    e.addMember('n1', 'n2')
    e.remove({ kind: 'member', id: 'm1' })
    expect(e.structure.value.members).toHaveLength(0)
    expect(e.canUndo.value).toBe(true)
    e.undo()
    expect(e.structure.value.members).toHaveLength(1)
    expect(e.canRedo.value).toBe(true)
    e.redo()
    expect(e.structure.value.members).toHaveLength(0)
    // A new change clears the redo stack.
    e.undo()
    e.addSupport('n1')
    expect(e.canRedo.value).toBe(false)
  })

  it('coalesces a drag or typing into one undo step', () => {
    const e = buildBeam()
    e.moveNode('n1', 0.5, 0, 'drag:1')
    e.moveNode('n1', 1, 0, 'drag:1')
    e.moveNode('n1', 1.5, 0, 'drag:1')
    e.endEdit()
    e.undo()
    expect(e.structure.value.nodes[0]).toMatchObject({ x: 0, y: 0 })
    e.updateDetails({ name: 'B' }, 'name')
    e.updateDetails({ name: 'Be' }, 'name')
    e.updateDetails({ name: 'Bea' }, 'name')
    e.undo()
    expect(e.structure.value.name).toBe('Beam')
  })

  it('tracks validity, invalid elements, and unsaved changes', () => {
    const e = buildBeam()
    expect(e.isValid.value).toBe(false)
    expect(e.invalidKeys.value.size).toBe(0)
    e.addMember('n1', 'n2')
    expect(e.isValid.value).toBe(true)
    e.addLoad('n1', { fx: 0, fy: 0 })
    expect(e.invalidKeys.value.has('load:l1')).toBe(true)
    expect(e.isDirty.value).toBe(true)
    e.markSaved({ ...e.structure.value, id: 'str_1' })
    expect(e.isDirty.value).toBe(false)
    expect(e.structure.value.id).toBe('str_1')
    expect(e.canUndo.value).toBe(true)
  })

  it('load() replaces the structure and clears history and selection', () => {
    const e = buildBeam()
    e.load({ id: 'x', name: 'Loaded', nodes: [], members: [], supports: [], loads: [] })
    expect(e.structure.value.name).toBe('Loaded')
    expect(e.canUndo.value).toBe(false)
    expect(e.selection.value).toBeNull()
    expect(e.isDirty.value).toBe(false)
  })
})
