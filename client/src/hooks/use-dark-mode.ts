import * as React from 'react'

const DARK_QUERY = '(prefers-color-scheme: dark)'

const canMatchMedia = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function'

export function useIsDarkMode() {
  const [isDark, setIsDark] = React.useState<boolean>(
    () => canMatchMedia() && window.matchMedia(DARK_QUERY).matches,
  )

  React.useEffect(() => {
    if (!canMatchMedia()) return
    const mql = window.matchMedia(DARK_QUERY)
    const onChange = () => setIsDark(mql.matches)
    mql.addEventListener('change', onChange)
    setIsDark(mql.matches)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isDark
}
