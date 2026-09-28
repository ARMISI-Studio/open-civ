/**
 * Request and response shapes of the backend API — the single place to update when the
 * backend contract changes. API modules map these DTOs to domain models.
 *
 * Endpoints (relative to API_BASE_URL):
 *   GET    /structures                      → StructureSummaryDto[]
 *   POST   /structures         StructureInputDto → StructureDto
 *   GET    /structures/:id                  → StructureDto
 *   PUT    /structures/:id     StructureInputDto → StructureDto
 *   DELETE /structures/:id                  → 204
 *   GET    /questions                       → QuestionSummaryDto[]
 *   POST   /questions          QuestionInputDto  → QuestionDto
 *   GET    /questions/:id                   → QuestionDto
 *   PUT    /questions/:id      QuestionInputDto  → QuestionDto
 *   POST   /questions/:id/share             → QuestionShareDto
 *   GET    /shared                          → SharedQuestionSummaryDto[]
 *   GET    /shared/:shareId                 → SharedQuestionDto
 *   POST   /shared/:shareId/answers  AnswerInputDto → AnswerResultDto
 *
 * Errors: any non-2xx response has an ApiErrorBody (see client.ts). Validation failures use
 * status 422 and code `validation_failed`, with messages per field in `error.fields`.
 */

export type SupportTypeDto = 'pin' | 'roller' | 'fixed'

export interface StructureNodeDto {
  id: string
  label: string
  x: number
  y: number
}

export interface StructureMemberDto {
  id: string
  startNodeId: string
  endNodeId: string
  label?: string
}

export interface StructureSupportDto {
  id: string
  nodeId: string
  type: SupportTypeDto
}

export interface StructureLoadDto {
  id: string
  nodeId: string
  fx: number
  fy: number
}

export interface StructureInputDto {
  name: string
  description?: string
  nodes: StructureNodeDto[]
  members: StructureMemberDto[]
  supports: StructureSupportDto[]
  loads: StructureLoadDto[]
  metadata?: Record<string, unknown>
}

export interface StructureDto extends StructureInputDto {
  id: string
  createdAt: string
  updatedAt: string
}

export interface StructureSummaryDto {
  id: string
  name: string
  description?: string
  updatedAt: string
}

export type AnswerTypeDto = 'multipleChoice' | 'shortAnswer'

export interface QuestionOptionDto {
  id: string
  text: string
  correct: boolean
}

export interface QuestionInputDto {
  title: string
  prompt: string
  structureId?: string
  answerType: AnswerTypeDto
  options?: { id?: string; text: string; correct: boolean }[]
  explanation?: string
}

export interface QuestionShareDto {
  shareId: string
  url: string
  createdAt: string
}

export interface QuestionDto {
  id: string
  title: string
  prompt: string
  structureId?: string
  answerType: AnswerTypeDto
  options?: QuestionOptionDto[]
  explanation?: string
  share?: QuestionShareDto
  createdAt: string
  updatedAt: string
}

export interface QuestionSummaryDto {
  id: string
  title: string
  structureId?: string
  structureName?: string
  share?: QuestionShareDto
  updatedAt: string
}

/** A question that is currently shared and can be answered. */
export interface SharedQuestionSummaryDto {
  shareId: string
  title: string
  prompt: string
  structureName?: string
  sharedAt: string
}

/** What a respondent receives: no correct flags, the structure embedded. */
export interface SharedQuestionDto {
  shareId: string
  title: string
  prompt: string
  answerType: AnswerTypeDto
  options: { id: string; text: string }[]
  structure: StructureDto | null
}

export interface AnswerInputDto {
  optionId: string
}

export interface AnswerResultDto {
  answerId: string
  correct: boolean
  correctOptionId: string
  explanation?: string
  submittedAt: string
}
