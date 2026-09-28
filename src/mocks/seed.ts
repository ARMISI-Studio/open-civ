import type { StructureDto } from '@/api/types'

const SEED_TIME = '2026-09-01T09:00:00.000Z'

export function seedStructures(): StructureDto[] {
  return [
    {
      id: 'str_simplebeam',
      name: 'Simply supported beam',
      description: '6 m beam with a 10 kN point load at midspan.',
      nodes: [
        { id: 'n1', label: 'A', x: 0, y: 0 },
        { id: 'n2', label: 'B', x: 3, y: 0 },
        { id: 'n3', label: 'C', x: 6, y: 0 },
      ],
      members: [
        { id: 'm1', startNodeId: 'n1', endNodeId: 'n2' },
        { id: 'm2', startNodeId: 'n2', endNodeId: 'n3' },
      ],
      supports: [
        { id: 's1', nodeId: 'n1', type: 'pin' },
        { id: 's2', nodeId: 'n3', type: 'roller' },
      ],
      loads: [{ id: 'l1', nodeId: 'n2', fx: 0, fy: -10 }],
      createdAt: SEED_TIME,
      updatedAt: SEED_TIME,
    },
    {
      id: 'str_cantilever',
      name: 'Cantilever',
      description: '4 m cantilever with a 5 kN tip load.',
      nodes: [
        { id: 'n1', label: 'A', x: 0, y: 0 },
        { id: 'n2', label: 'B', x: 4, y: 0 },
      ],
      members: [{ id: 'm1', startNodeId: 'n1', endNodeId: 'n2' }],
      supports: [{ id: 's1', nodeId: 'n1', type: 'fixed' }],
      loads: [{ id: 'l1', nodeId: 'n2', fx: 0, fy: -5 }],
      createdAt: SEED_TIME,
      updatedAt: SEED_TIME,
    },
  ]
}
