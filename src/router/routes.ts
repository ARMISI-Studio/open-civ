import type { RouteRecordRaw } from 'vue-router'

export const DEFAULT_ROUTE = '/structures'

export const routes: RouteRecordRaw[] = [
  { path: '/', redirect: DEFAULT_ROUTE },
  {
    path: '/structures',
    name: 'structures',
    component: () => import('@/views/StructureEditorView.vue'),
    meta: { title: 'Structure Editor' },
  },
  {
    path: '/structures/:structureId',
    name: 'structure-edit',
    component: () => import('@/views/StructureEditorView.vue'),
    props: true,
    meta: { title: 'Structure Editor' },
  },
  {
    path: '/questions/create',
    name: 'question-create',
    component: () => import('@/views/QuestionBuilderView.vue'),
    meta: { title: 'Question Builder' },
  },
  {
    path: '/questions/answer',
    name: 'question-answer',
    component: () => import('@/views/AnswerQuestionsView.vue'),
    meta: { title: 'Answer Questions' },
  },
  {
    path: '/questions/answer/:shareId',
    name: 'question-answer-shared',
    component: () => import('@/views/AnswerQuestionsView.vue'),
    props: true,
    meta: { title: 'Answer Questions' },
  },
  {
    // Component preview for the shared UI layer; not linked from the main tabs.
    path: '/ui-preview',
    name: 'ui-preview',
    component: () => import('@/views/UiPreviewView.vue'),
    meta: { title: 'UI preview' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: 'Page not found' },
  },
]
