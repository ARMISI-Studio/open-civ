import type { Structure, StructureDraft, StructureSummary } from '@/domain/structures'
import { apiRequest } from './client'
import type { StructureDto, StructureInputDto, StructureSummaryDto } from './types'

export function toStructure(dto: StructureDto): Structure {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description ?? '',
    nodes: dto.nodes.map((n) => ({ id: n.id, label: n.label, x: n.x, y: n.y })),
    members: dto.members.map((m) => ({
      id: m.id,
      startNodeId: m.startNodeId,
      endNodeId: m.endNodeId,
      ...(m.label ? { label: m.label } : {}),
    })),
    supports: dto.supports.map((s) => ({ id: s.id, nodeId: s.nodeId, type: s.type })),
    loads: dto.loads.map((l) => ({ id: l.id, nodeId: l.nodeId, fx: l.fx, fy: l.fy })),
    ...(dto.metadata ? { metadata: dto.metadata } : {}),
  }
}

export function toStructureInput(structure: StructureDraft): StructureInputDto {
  return {
    name: structure.name.trim(),
    description: structure.description?.trim() || undefined,
    nodes: structure.nodes.map((n) => ({ id: n.id, label: n.label.trim(), x: n.x, y: n.y })),
    members: structure.members.map((m) => ({
      id: m.id,
      startNodeId: m.startNodeId,
      endNodeId: m.endNodeId,
      label: m.label?.trim() || undefined,
    })),
    supports: structure.supports.map((s) => ({ id: s.id, nodeId: s.nodeId, type: s.type })),
    loads: structure.loads.map((l) => ({ id: l.id, nodeId: l.nodeId, fx: l.fx, fy: l.fy })),
    metadata: structure.metadata,
  }
}

function toSummary(dto: StructureSummaryDto): StructureSummary {
  return { id: dto.id, name: dto.name, description: dto.description, updatedAt: dto.updatedAt }
}

export async function listStructures(): Promise<StructureSummary[]> {
  return (await apiRequest<StructureSummaryDto[]>('/structures')).map(toSummary)
}

export async function getStructure(id: string): Promise<Structure> {
  return toStructure(await apiRequest<StructureDto>(`/structures/${encodeURIComponent(id)}`))
}

export async function createStructure(structure: StructureDraft): Promise<Structure> {
  return toStructure(
    await apiRequest<StructureDto>('/structures', {
      method: 'POST',
      body: toStructureInput(structure),
    }),
  )
}

export async function updateStructure(id: string, structure: StructureDraft): Promise<Structure> {
  return toStructure(
    await apiRequest<StructureDto>(`/structures/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: toStructureInput(structure),
    }),
  )
}

/** Creates the structure when it has no id yet, otherwise updates it. */
export function saveStructure(structure: StructureDraft): Promise<Structure> {
  return structure.id ? updateStructure(structure.id, structure) : createStructure(structure)
}

export async function deleteStructure(id: string): Promise<void> {
  await apiRequest<void>(`/structures/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
