import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import * as answersApi from '@/api/answers'
import { ApiError, errorMessage } from '@/api/client'
import { type AnswerResult, type SharedQuestion, validateAnswer } from '@/domain/answers'
import type { RequestStatus } from './useStructures'

/** Loads a shared question by share id and submits one answer to it. */
export function useAnswerQuestion(shareId: MaybeRefOrGetter<string | undefined>) {
  const question = ref<SharedQuestion | null>(null)
  const loadStatus = ref<RequestStatus>('idle')
  const loadError = ref<string | null>(null)
  const notFound = ref(false)

  const selectedOptionId = ref<string | null>(null)
  const attempted = ref(false)
  const submitStatus = ref<RequestStatus>('idle')
  const submitError = ref<string | null>(null)
  const result = ref<AnswerResult | null>(null)

  const validationError = computed(() =>
    question.value
      ? validateAnswer(question.value, selectedOptionId.value)
      : 'Question not loaded.',
  )
  const isSubmitted = computed(() => result.value !== null)
  const isSubmitting = computed(() => submitStatus.value === 'loading')
  /** Submit stays disabled until an answer is chosen, while sending, and after a result. */
  const canSubmit = computed(
    () => !validationError.value && !isSubmitting.value && !isSubmitted.value,
  )

  let loadToken = 0

  async function load() {
    const id = toValue(shareId)
    const token = ++loadToken
    question.value = null
    selectedOptionId.value = null
    attempted.value = false
    result.value = null
    submitStatus.value = 'idle'
    submitError.value = null
    notFound.value = false
    loadError.value = null
    if (!id) {
      loadStatus.value = 'idle'
      return
    }
    loadStatus.value = 'loading'
    try {
      const loaded = await answersApi.getSharedQuestion(id)
      if (token !== loadToken) return
      question.value = loaded
      loadStatus.value = 'success'
    } catch (error) {
      if (token !== loadToken) return
      notFound.value = error instanceof ApiError && error.status === 404
      loadError.value = errorMessage(error)
      loadStatus.value = 'error'
    }
  }

  function select(optionId: string) {
    if (isSubmitted.value || isSubmitting.value) return
    selectedOptionId.value = optionId
    submitError.value = null
  }

  async function submit(): Promise<AnswerResult | null> {
    attempted.value = true
    // Guard against double clicks and resubmitting after a result.
    if (!canSubmit.value || !question.value || !selectedOptionId.value) return null
    submitStatus.value = 'loading'
    submitError.value = null
    try {
      result.value = await answersApi.submitAnswer(question.value.shareId, selectedOptionId.value)
      submitStatus.value = 'success'
      return result.value
    } catch (error) {
      submitError.value = errorMessage(error)
      submitStatus.value = 'error'
      return null
    }
  }

  watch(() => toValue(shareId), load, { immediate: true })

  return {
    question,
    loadStatus,
    loadError,
    notFound,
    selectedOptionId,
    attempted,
    validationError,
    submitStatus,
    submitError,
    result,
    isSubmitted,
    isSubmitting,
    canSubmit,
    load,
    select,
    submit,
  }
}

export type AnswerQuestionState = ReturnType<typeof useAnswerQuestion>
