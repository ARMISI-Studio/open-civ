export interface MainTab {
  label: string
  to: string
  /** Any route whose path is, or is nested under, one of these prefixes marks the tab active. */
  matches: string[]
}

export const MAIN_TABS: MainTab[] = [
  { label: 'Structure Editor', to: '/structures', matches: ['/structures'] },
  { label: 'Question Builder', to: '/questions/create', matches: ['/questions/create'] },
  { label: 'Answer Questions', to: '/questions/answer', matches: ['/questions/answer'] },
]

export function findActiveTab(path: string): MainTab | undefined {
  return MAIN_TABS.find((tab) =>
    tab.matches.some((prefix) => path === prefix || path.startsWith(`${prefix}/`)),
  )
}
