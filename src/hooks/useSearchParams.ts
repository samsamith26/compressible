import { useMemo, useSyncExternalStore } from 'react'
import { getSearch, subscribeSearch, updateSearch } from '@/lib/urlStore'

/** Current query parameters plus a setter that merges updates into the URL. */
export function useSearchParams(): readonly [URLSearchParams, typeof updateSearch] {
  const search = useSyncExternalStore(subscribeSearch, getSearch, () => '')
  const params = useMemo(() => new URLSearchParams(search), [search])
  return [params, updateSearch]
}
