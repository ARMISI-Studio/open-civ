/**
 * Linear-elastic analysis of a 2D frame by the direct stiffness method.
 *
 * This file holds all of the app's structural-engineering calculations, so they can be
 * reviewed in one place. The UI only displays what these functions return.
 * Hand-checkable examples are in ./__tests__/frame2d.spec.ts.
 *
 * ─── Method ──────────────────────────────────────────────────────────────────────────────
 * Direct stiffness method for plane frames (Euler–Bernoulli beam-column elements),
 * as in A. Kassimali, "Matrix Analysis of Structures", ch. 6, or W. McGuire,
 * R. Gallagher, R. Ziemian, "Matrix Structural Analysis", ch. 4.
 *   1. Each node has three degrees of freedom (DOF): ux, uy, rz.
 *   2. Each member contributes its global stiffness Kg = Tᵀ · k · T (see memberStiffness).
 *   3. Supports fix DOFs; the free part of K · d = F is solved for the displacements d.
 *   4. Reactions are R = K · d − F at the fixed DOFs.
 *   5. Member end forces are f = k · T · d_member, in member (local) axes.
 *
 * ─── Assumptions and limits ──────────────────────────────────────────────────────────────
 * - Small displacements, linear-elastic material, first-order analysis (no P-Δ effects).
 * - Axial and bending deformation are included; shear deformation is ignored.
 * - Every member-to-node connection is rigid (moments pass through joints).
 *   There are no internal hinges and no truss (pin-jointed) members.
 * - Every member has the same section and material: DEFAULT_SECTION below.
 *   Reactions and member forces of statically determinate structures do not depend on it.
 *   Displacements, and the forces in indeterminate structures, do.
 * - Loads are point forces at nodes only (no member loads, no applied moments), so the
 *   deflected shape between nodes is exactly the cubic given by the end displacements.
 * - Supports: pin fixes ux and uy; roller fixes uy only (it rolls horizontally, whatever
 *   the ground slope is drawn as); fixed fixes ux, uy and rz. No spring supports.
 * - A structure that can move without deforming (a mechanism, or too few supports)
 *   is reported as unstable instead of being solved.
 *
 * ─── Units and sign conventions ──────────────────────────────────────────────────────────
 * - Lengths in m, forces in kN, moments in kN·m, E in kN/m², A in m², I in m⁴.
 * - Global axes: x to the right, y up. Rotations and moments: counter-clockwise positive.
 * - Loads (fx, fy) and reactions (rx, ry, mz) follow the global axes.
 * - Member local axes: x runs from the start node to the end node; y is x turned 90°
 *   counter-clockwise.
 * - Member internal forces (MemberSectionForces) use the usual beam convention:
 *     N > 0  tension.
 *     V > 0  shear, with dM/dx = V along the member's local x.
 *     M > 0  tension on the member's right-hand side when looking from the start node
 *            to the end node. For a beam drawn left to right this is sagging.
 */
import type { StructureDraft, StructureMember, StructureNode, SupportType } from '../structures'

export interface Section {
  /** Young's modulus, kN/m². */
  E: number
  /** Cross-sectional area, m². */
  A: number
  /** Second moment of area about the bending axis, m⁴. */
  I: number
}

/**
 * Default member properties: structural steel (E = 200 GPa) and a section of about the size
 * of an IPE 300 beam (A = 53.8 cm², Iy = 8356 cm⁴).
 */
export const DEFAULT_SECTION: Section = {
  E: 200e6,
  A: 53.8e-4,
  I: 8356e-8,
}

/** Which global DOFs each support type fixes: [ux, uy, rz]. */
export const SUPPORT_RESTRAINTS: Record<SupportType, [boolean, boolean, boolean]> = {
  pin: [true, true, false],
  roller: [false, true, false],
  fixed: [true, true, true],
}

export interface NodeDisplacement {
  nodeId: string
  /** m */
  ux: number
  /** m */
  uy: number
  /** rad, counter-clockwise positive */
  rz: number
}

export interface SupportReaction {
  supportId: string
  nodeId: string
  /** kN; 0 when the support does not fix ux. */
  rx: number
  /** kN */
  ry: number
  /** kN·m, counter-clockwise positive; 0 unless the support is fixed. */
  mz: number
}

/** Internal forces at one end of a member, in the beam convention described above. */
export interface MemberSectionForces {
  /** Axial force, kN (tension positive). */
  N: number
  /** Shear force, kN. */
  V: number
  /** Bending moment, kN·m (tension on the member's right-hand side positive). */
  M: number
}

export interface MemberForces {
  memberId: string
  /** m */
  length: number
  start: MemberSectionForces
  end: MemberSectionForces
}

export type AnalysisResult =
  | {
      status: 'solved'
      section: Section
      displacements: NodeDisplacement[]
      reactions: SupportReaction[]
      memberForces: MemberForces[]
    }
  | { status: 'unstable'; message: string }
  | { status: 'invalid'; message: string }

/** Pivots smaller than this fraction of the largest stiffness term count as zero (mechanism). */
const SINGULAR_TOLERANCE = 1e-10

// ─── Member matrices ───────────────────────────────────────────────────────────────────────

interface MemberGeometry {
  length: number
  /** Direction cosines of the member's local x axis. */
  c: number
  s: number
}

function memberGeometry(a: StructureNode, b: StructureNode): MemberGeometry {
  const length = Math.hypot(b.x - a.x, b.y - a.y)
  return { length, c: (b.x - a.x) / length, s: (b.y - a.y) / length }
}

/**
 * Stiffness of a plane frame member in local axes, 6×6, DOF order
 * [u1, v1, θ1, u2, v2, θ2] (start node, then end node).
 * Kassimali eq. 6.6; McGuire et al. eq. 4.34.
 */
export function localStiffness(length: number, { E, A, I }: Section): number[][] {
  const L = length
  const a = (E * A) / L // axial
  const b = (12 * E * I) / L ** 3 // transverse force from transverse displacement
  const c = (6 * E * I) / L ** 2 // force from rotation, or moment from displacement
  const d = (4 * E * I) / L // moment at an end from rotation at the same end
  const e = (2 * E * I) / L // moment at an end from rotation at the other end
  return [
    [a, 0, 0, -a, 0, 0],
    [0, b, c, 0, -b, c],
    [0, c, d, 0, -c, e],
    [-a, 0, 0, a, 0, 0],
    [0, -b, -c, 0, b, -c],
    [0, c, e, 0, -c, d],
  ]
}

/**
 * Transformation from global to local member DOFs: d_local = T · d_global.
 * c = cos φ, s = sin φ, where φ is the angle of the member's local x axis from global x.
 */
export function transformation({ c, s }: { c: number; s: number }): number[][] {
  return [
    [c, s, 0, 0, 0, 0],
    [-s, c, 0, 0, 0, 0],
    [0, 0, 1, 0, 0, 0],
    [0, 0, 0, c, s, 0],
    [0, 0, 0, -s, c, 0],
    [0, 0, 0, 0, 0, 1],
  ]
}

/** Global member stiffness, Kg = Tᵀ · k · T. */
function memberStiffness(geometry: MemberGeometry, section: Section): number[][] {
  const k = localStiffness(geometry.length, section)
  const T = transformation(geometry)
  return multiply(transpose(T), multiply(k, T))
}

// ─── Analysis ──────────────────────────────────────────────────────────────────────────────

export function analyzeStructure(
  structure: StructureDraft,
  section: Section = DEFAULT_SECTION,
): AnalysisResult {
  const nodes = structure.nodes
  const nodeIndex = new Map(nodes.map((n, i) => [n.id, i]))
  const label = (id: string) => nodes[nodeIndex.get(id) ?? -1]?.label ?? '?'

  // Checks the matrices need. The editor's own validation catches these first.
  if (structure.members.length === 0) return invalid('Add at least one member.')
  const members: { member: StructureMember; geometry: MemberGeometry; dofs: number[] }[] = []
  const connected = new Set<string>()
  for (const member of structure.members) {
    const i = nodeIndex.get(member.startNodeId)
    const j = nodeIndex.get(member.endNodeId)
    if (i === undefined || j === undefined) return invalid('A member is missing one of its nodes.')
    const geometry = memberGeometry(nodes[i]!, nodes[j]!)
    if (!(geometry.length > 0)) {
      return invalid(
        `Member ${label(member.startNodeId)}–${label(member.endNodeId)} has zero length.`,
      )
    }
    members.push({ member, geometry, dofs: [...nodeDofs(i), ...nodeDofs(j)] })
    connected.add(member.startNodeId).add(member.endNodeId)
  }
  const loose = nodes.find((n) => !connected.has(n.id))
  if (loose) return invalid(`Node ${loose.label} is not connected to any member.`)

  // 1. Assemble the global stiffness matrix K (3 DOFs per node).
  const size = nodes.length * 3
  const K = zeros(size, size)
  for (const { geometry, dofs } of members) {
    const kg = memberStiffness(geometry, section)
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) K[dofs[r]!]![dofs[c]!]! += kg[r]![c]!
    }
  }

  // 2. Load vector F from the nodal point loads.
  const F = Array.from({ length: size }, () => 0)
  for (const load of structure.loads) {
    const i = nodeIndex.get(load.nodeId)
    if (i === undefined) return invalid('A load is applied to a missing node.')
    F[3 * i] = F[3 * i]! + load.fx
    F[3 * i + 1] = F[3 * i + 1]! + load.fy
  }

  // 3. Split DOFs into fixed (by supports) and free.
  const fixed = Array.from({ length: size }, () => false)
  for (const support of structure.supports) {
    const i = nodeIndex.get(support.nodeId)
    if (i === undefined) return invalid('A support is attached to a missing node.')
    SUPPORT_RESTRAINTS[support.type].forEach((isFixed, k) => {
      if (isFixed) fixed[3 * i + k] = true
    })
  }
  const free = range(size).filter((k) => !fixed[k])

  // 4. Solve K_ff · d_f = F_f. Fixed DOFs have zero displacement.
  const d = Array.from({ length: size }, () => 0)
  if (free.length > 0) {
    const Kff = free.map((r) => free.map((c) => K[r]![c]!))
    const Ff = free.map((r) => F[r]!)
    const df = solve(Kff, Ff)
    if (!df) {
      return {
        status: 'unstable',
        message:
          'The structure is unstable: part of it can move or rotate without resistance. Add or change supports or members.',
      }
    }
    free.forEach((k, n) => (d[k] = df[n]!))
  }

  // 5. Reactions R = K · d − F, at fixed DOFs only.
  const Kd = multiplyVector(K, d)
  const reaction = (k: number) => (fixed[k] ? clean(Kd[k]! - F[k]!) : 0)
  const reactions: SupportReaction[] = structure.supports.map((support) => {
    const i = nodeIndex.get(support.nodeId)!
    return {
      supportId: support.id,
      nodeId: support.nodeId,
      rx: reaction(3 * i),
      ry: reaction(3 * i + 1),
      mz: reaction(3 * i + 2),
    }
  })

  // 6. Member end forces in local axes, f = k · T · d_member, then to the beam convention.
  const memberForces: MemberForces[] = members.map(({ member, geometry, dofs }) => {
    const local = multiplyVector(
      transformation(geometry),
      dofs.map((k) => d[k]!),
    )
    const f = multiplyVector(localStiffness(geometry.length, section), local).map(clean)
    // f = [F1x, F1y, M1, F2x, F2y, M2]: forces the nodes apply to the member ends, local
    // axes, counter-clockwise moments positive. Internal forces at each end follow from
    // equilibrium of a short piece of member at that end.
    return {
      memberId: member.id,
      length: geometry.length,
      start: { N: clean(-f[0]!), V: f[1]!, M: clean(-f[2]!) },
      end: { N: f[3]!, V: clean(-f[4]!), M: f[5]! },
    }
  })

  const displacements: NodeDisplacement[] = nodes.map((n, i) => ({
    nodeId: n.id,
    ux: d[3 * i]!,
    uy: d[3 * i + 1]!,
    rz: d[3 * i + 2]!,
  }))

  return { status: 'solved', section, displacements, reactions, memberForces }
}

// ─── Deflected shape ───────────────────────────────────────────────────────────────────────

export interface Point {
  x: number
  y: number
}

/**
 * Points along a member's deflected shape, with displacements multiplied by `scale`.
 * Axial displacement varies linearly. Transverse displacement uses the cubic Hermite shape
 * functions of the beam element (Kassimali eq. 6.12), which are exact without member loads:
 *   v(ξ) = N1·v1 + N2·θ1 + N3·v2 + N4·θ2,  ξ = x / L
 *   N1 = 1 − 3ξ² + 2ξ³,  N2 = L(ξ − 2ξ² + ξ³),  N3 = 3ξ² − 2ξ³,  N4 = L(ξ³ − ξ²)
 */
export function deflectedMember(
  structure: StructureDraft,
  result: Extract<AnalysisResult, { status: 'solved' }>,
  memberId: string,
  scale: number,
  segments = 16,
): Point[] {
  const member = structure.members.find((m) => m.id === memberId)
  const a = structure.nodes.find((n) => n.id === member?.startNodeId)
  const b = structure.nodes.find((n) => n.id === member?.endNodeId)
  const da = result.displacements.find((x) => x.nodeId === a?.id)
  const db = result.displacements.find((x) => x.nodeId === b?.id)
  if (!a || !b || !da || !db) return []
  const geometry = memberGeometry(a, b)
  const { length: L, c, s } = geometry
  const [u1, v1, t1, u2, v2, t2] = multiplyVector(transformation(geometry), [
    da.ux,
    da.uy,
    da.rz,
    db.ux,
    db.uy,
    db.rz,
  ]) as [number, number, number, number, number, number]

  return range(segments + 1).map((k) => {
    const xi = k / segments
    const u = (1 - xi) * u1 + xi * u2
    const v =
      (1 - 3 * xi ** 2 + 2 * xi ** 3) * v1 +
      L * (xi - 2 * xi ** 2 + xi ** 3) * t1 +
      (3 * xi ** 2 - 2 * xi ** 3) * v2 +
      L * (xi ** 3 - xi ** 2) * t2
    // Back to global axes: local (u, v) → global (c·u − s·v, s·u + c·v).
    return {
      x: a.x + c * xi * L + scale * (c * u - s * v),
      y: a.y + s * xi * L + scale * (s * u + c * v),
    }
  })
}

/** Largest displacement anywhere along the members, in m (sampled along each member). */
export function maxDisplacement(
  structure: StructureDraft,
  result: Extract<AnalysisResult, { status: 'solved' }>,
): number {
  let max = 0
  for (const member of structure.members) {
    const plain = deflectedMember(structure, result, member.id, 0)
    const moved = deflectedMember(structure, result, member.id, 1)
    moved.forEach((p, k) => {
      max = Math.max(max, Math.hypot(p.x - plain[k]!.x, p.y - plain[k]!.y))
    })
  }
  return max
}

// ─── Small linear-algebra helpers ──────────────────────────────────────────────────────────

function invalid(message: string): AnalysisResult {
  return { status: 'invalid', message }
}

function nodeDofs(index: number): number[] {
  return [3 * index, 3 * index + 1, 3 * index + 2]
}

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i)
}

function zeros(rows: number, cols: number): number[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0))
}

function transpose(m: number[][]): number[][] {
  return m[0]!.map((_, c) => m.map((row) => row[c]!))
}

function multiply(a: number[][], b: number[][]): number[][] {
  return a.map((row) => b[0]!.map((_, c) => row.reduce((sum, v, k) => sum + v * b[k]![c]!, 0)))
}

function multiplyVector(m: number[][], v: number[]): number[] {
  return m.map((row) => row.reduce((sum, x, k) => sum + x * v[k]!, 0))
}

/** Rounds away floating-point noise such as 1e-13 kN, and -0. */
function clean(value: number): number {
  return Math.abs(value) < 1e-9 ? 0 : value
}

/**
 * Solves A · x = b by Gaussian elimination with partial pivoting.
 * Returns null when A is singular, which here means the structure is a mechanism.
 */
function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length
  const m = A.map((row, i) => [...row, b[i]!])
  const scale = Math.max(...A.map((row, i) => Math.abs(row[i]!)))
  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(m[r]![col]!) > Math.abs(m[pivot]![col]!)) pivot = r
    }
    if (!(Math.abs(m[pivot]![col]!) > SINGULAR_TOLERANCE * scale)) return null
    ;[m[col], m[pivot]] = [m[pivot]!, m[col]!]
    for (let r = col + 1; r < n; r++) {
      const factor = m[r]![col]! / m[col]![col]!
      for (let c = col; c <= n; c++) m[r]![c]! -= factor * m[col]![c]!
    }
  }
  const x = Array.from({ length: n }, () => 0)
  for (let r = n - 1; r >= 0; r--) {
    let sum = m[r]![n]!
    for (let c = r + 1; c < n; c++) sum -= m[r]![c]! * x[c]!
    x[r] = sum / m[r]![r]!
  }
  return x
}
