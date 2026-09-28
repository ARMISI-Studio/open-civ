export interface MainTab {
  label: string
  to: string
  /** Any route whose path is, or is nested under, one of these prefixes marks the tab active. */
  matches: string[]
}

export const MAIN_TABS: MainTab[] = [
  { label: 'Structures', to: '/structures', matches: ['/structures'] },
  { label: 'Questions', to: '/questions', matches: ['/questions'] },
  { label: 'Answers', to: '/answers', matches: ['/answers'] },
]

export function findActiveTab(path: string): MainTab | undefined {
  return MAIN_TABS.find((tab) =>
    tab.matches.some((prefix) => path === prefix || path.startsWith(`${prefix}/`)),
  )
}
