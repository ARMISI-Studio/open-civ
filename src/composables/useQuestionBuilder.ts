import { computed, ref } from 'vue'
import * as questionsApi from '@/api/questions'
import * as structuresApi from '@/api/structures'
import { ApiError, errorMessage } from '@/api/client'
import {
  type Question,
  type QuestionDraft,
  type QuestionErrors,
  type QuestionShare,
  QUESTION_LIMITS,
  countQuestionErrors,
  createEmptyQuestion,
  hasQuestionErrors,
  newOptionDraft,
  questionToDraft,
  validateQuestion,
} from '@/domain/questions'
import { createEmptyStructure } from '@/domain/structures'
import { useStructureEditor } from './useStructureEditor'
import type { RequestStatus } from './useStructures'

export type StructureSource = 'existing' | 'new'

/** Maps API field names to the form's error keys. */
const API_FIELDS: Record<string, keyof Omit<QuestionErrors, 'optionText'>> = {
  title: 'title',
  prompt: 'prompt',
  structureId: 'structure',
  answerType: 'answerType',
  options: 'options',
  explanation: 'explanation',
}

/**
 * State for building one question: the draft, where its structure comes from (a saved one or a
 * new one drawn here), validation, saving, and sharing through the API.
 */
export function useQuestionBuilder() {
  const draft = ref<QuestionDraft>(createEmptyQuestion())
  const structureSource = ref<StructureSource>('existing')
  const newStructure = useStructureEditor()

  /** Validation messages appear after the first save attempt. */
  const attempted = ref(false)
  const serverErrors = ref<Partial<QuestionErrors>>({})

  const saveStatus = ref<RequestStatus>('idle')
  const saveError = ref<string | null>(null)
  const saved = ref<Question | null>(null)
  const savedSnapshot = ref<string | null>(null)

  const shareStatus = ref<RequestStatus>('idle')
  const shareError = ref<string | null>(null)
  const share = ref<QuestionShare | null>(null)

  const localErrors = computed(() =>
    validateQuestion(draft.value, { requireStructure: structureSource.value === 'existing' }),
  )
  const newStructureInvalid = computed(
    () => structureSource.value === 'new' && !newStructure.isValid.value,
  )
  const isValid = computed(
    () => !hasQuestionErrors(localErrors.value) && !newStructureInvalid.value,
  )

  const errors = computed<QuestionErrors>(() =>
    attempted.value
      ? { ...serverErrors.value, ...localErrors.value, optionText: localErrors.value.optionText }
      : { ...serverErrors.value, optionText: {} },
  )
  const errorCount = computed(
    () =>
      countQuestionErrors(localErrors.value) +
      (newStructureInvalid.value ? newStructure.issues.value.length : 0),
  )

  function snapshot() {
    return JSON.stringify({
      draft: { ...draft.value, options: draft.value.options.map(({ key: _key, ...o }) => o) },
      source: structureSource.value,
      structure: structureSource.value === 'new' ? newStructure.structure.value : null,
    })
  }

  const isSaved = computed(() => saved.value !== null)
  const isDirty = computed(() => savedSnapshot.value !== snapshot())
  const canShare = computed(() => isSaved.value && !isDirty.value)

  // --- Draft editing ------------------------------------------------------------------------

  function update(patch: Partial<Omit<QuestionDraft, 'options' | 'id'>>) {
    Object.assign(draft.value, patch)
    for (const key of Object.keys(patch)) {
      const field = key === 'structureId' ? 'structure' : (key as keyof QuestionErrors)
      if (field in serverErrors.value)
        serverErrors.value = { ...serverErrors.value, [field]: undefined }
    }
  }

  function setStructureSource(source: StructureSource) {
    structureSource.value = source
  }

  const canAddOption = computed(() => draft.value.options.length < QUESTION_LIMITS.maxOptions)
  const canRemoveOption = computed(() => draft.value.options.length > QUESTION_LIMITS.minOptions)

  function addOption() {
    if (canAddOption.value) draft.value.options.push(newOptionDraft())
  }

  function removeOption(key: string) {
    if (!canRemoveOption.value) return
    draft.value.options = draft.value.options.filter((o) => o.key !== key)
  }

  function setOptionText(key: string, text: string) {
    const option = draft.value.options.find((o) => o.key === key)
    if (option) option.text = text
  }

  function setCorrectOption(key: string) {
    for (const option of draft.value.options) option.correct = option.key === key
  }

  // --- Saving -------------------------------------------------------------------------------

  async function save(): Promise<Question | null> {
    attempted.value = true
    saveError.value = null
    serverErrors.value = {}
    if (!isValid.value) {
      saveStatus.value = 'idle'
      return null
    }
    saveStatus.value = 'loading'
    try {
      if (structureSource.value === 'new') {
        const structure = await structuresApi.saveStructure(newStructure.structure.value)
        newStructure.markSaved(structure)
        draft.value.structureId = structure.id
      }
      const question = await questionsApi.saveQuestion(draft.value)
      applySaved(question)
      saveStatus.value = 'success'
      return question
    } catch (error) {
      saveError.value = errorMessage(error)
      if (error instanceof ApiError) {
        const mapped: Partial<QuestionErrors> = {}
        for (const [field, message] of Object.entries(error.fields)) {
          const key = API_FIELDS[field]
          if (key) (mapped as Record<string, string>)[key] = message
        }
        serverErrors.value = mapped
      }
      saveStatus.value = 'error'
      return null
    }
  }

  function applySaved(question: Question) {
    saved.value = question
    const next = questionToDraft(question)
    // Keep the local option keys stable so inputs don't remount.
    next.options = next.options.map((o, i) => ({ ...o, key: draft.value.options[i]?.key ?? o.key }))
    draft.value = next
    if (question.share) share.value = question.share
    attempted.value = false
    savedSnapshot.value = snapshot()
  }

  // --- Sharing ------------------------------------------------------------------------------

  async function requestShare(): Promise<QuestionShare | null> {
    if (!saved.value || !canShare.value) return null
    shareStatus.value = 'loading'
    shareError.value = null
    try {
      share.value = await questionsApi.shareQuestion(saved.value.id)
      shareStatus.value = 'success'
      return share.value
    } catch (error) {
      shareError.value = errorMessage(error)
      shareStatus.value = 'error'
      return null
    }
  }

  // --- Loading a saved question for editing -------------------------------------------------

  const loadStatus = ref<RequestStatus>('idle')
  const loadError = ref<string | null>(null)
  const notFound = ref(false)

  async function loadQuestion(id: string): Promise<Question | null> {
    reset()
    loadStatus.value = 'loading'
    notFound.value = false
    try {
      const question = await questionsApi.getQuestion(id)
      applySaved(question)
      loadStatus.value = 'success'
      return question
    } catch (error) {
      notFound.value = error instanceof ApiError && error.status === 404
      loadError.value = notFound.value
        ? 'This question doesn’t exist or was deleted.'
        : errorMessage(error)
      loadStatus.value = 'error'
      return null
    }
  }

  function reset() {
    loadStatus.value = 'idle'
    loadError.value = null
    notFound.value = false
    draft.value = createEmptyQuestion()
    structureSource.value = 'existing'
    newStructure.load(createEmptyStructure())
    attempted.value = false
    serverErrors.value = {}
    saveStatus.value = 'idle'
    saveError.value = null
    saved.value = null
    savedSnapshot.value = null
    shareStatus.value = 'idle'
    shareError.value = null
    share.value = null
  }

  return {
    draft,
    structureSource,
    newStructure,
    errors,
    errorCount,
    attempted,
    isValid,
    newStructureInvalid,
    saveStatus,
    saveError,
    saved,
    isSaved,
    isDirty,
    canShare,
    shareStatus,
    shareError,
    share,
    canAddOption,
    canRemoveOption,
    update,
    setStructureSource,
    addOption,
    removeOption,
    setOptionText,
    setCorrectOption,
    save,
    requestShare,
    reset,
    loadStatus,
    loadError,
    notFound,
    loadQuestion,
  }
}

export type QuestionBuilder = ReturnType<typeof useQuestionBuilder>
