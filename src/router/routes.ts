import type { RouteRecordRaw } from 'vue-router'

export const DEFAULT_ROUTE = '/structures'

export const routes: RouteRecordRaw[] = [
  { path: '/', redirect: DEFAULT_ROUTE },

  // Structures
  {
    path: '/structures',
    name: 'structures',
    component: () => import('@/views/StructuresListView.vue'),
    meta: { title: 'Structures' },
  },
  {
    path: '/structures/new',
    name: 'structure-new',
    component: () => import('@/views/StructureEditorView.vue'),
    meta: { title: 'New structure' },
  },
  {
    path: '/structures/:structureId',
    name: 'structure-edit',
    component: () => import('@/views/StructureEditorView.vue'),
    props: true,
    meta: { title: 'Edit structure' },
  },

  // Questions
  {
    path: '/questions',
    name: 'questions',
    component: () => import('@/views/QuestionsListView.vue'),
    meta: { title: 'Questions' },
  },
  {
    path: '/questions/new',
    name: 'question-new',
    component: () => import('@/views/QuestionBuilderView.vue'),
    meta: { title: 'New question' },
  },
  {
    path: '/questions/:questionId',
    name: 'question-edit',
    component: () => import('@/views/QuestionBuilderView.vue'),
    props: true,
    meta: { title: 'Edit question' },
  },

  // Answers
  {
    path: '/answers',
    name: 'answers',
    component: () => import('@/views/AnswersListView.vue'),
    meta: { title: 'Answers' },
  },
  {
    path: '/answers/:shareId',
    name: 'answer',
    component: () => import('@/views/AnswerQuestionsView.vue'),
    props: true,
    meta: { title: 'Answer a question' },
  },

  // Earlier paths, kept so bookmarks and old share links still work.
  { path: '/questions/create', redirect: '/questions/new' },
  { path: '/questions/answer', redirect: '/answers' },
  { path: '/questions/answer/:shareId', redirect: (to) => `/answers/${to.params.shareId}` },

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
