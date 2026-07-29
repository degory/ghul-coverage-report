// Which of the two landing views `/` shows: the ranked coverage report, or
// the source browser. Nothing else keys off this - coverage annotation on
// the file pages is always on, in its own narrow lane, quiet enough to read
// past, so there is nothing to switch off. This is purely about where an
// arriving visitor is put down.
//
// Resolved from, in priority order: a `coverage=1`/`0` query parameter, so
// an inbound link can aim at either view regardless of what a returning
// visitor last chose; then localStorage, so a plain bookmark to `/`
// remembers that choice; then the default, which is the source browser.
import { ref, watch } from 'vue'

const STORAGE_KEY = 'coverage-report-landing'

export const coverageMode = ref(false)

let initialized = false

function readInitial() {
  const param = new URLSearchParams(window.location.search).get('coverage')
  if (param === '1') return true
  if (param === '0') return false

  return window.localStorage.getItem(STORAGE_KEY) === '1'
}

// VitePress prerenders on the server, where window/location don't exist, so
// this can only resolve client-side - call from onMounted, not module load.
// Guarded so a second mount doesn't clobber a choice already made this
// page-load.
export function initCoverageMode() {
  if (initialized) return
  initialized = true
  coverageMode.value = readInitial()
}

if (typeof window !== 'undefined') {
  watch(coverageMode, v => {
    window.localStorage.setItem(STORAGE_KEY, v ? '1' : '0')

    const url = new URL(window.location.href)
    url.searchParams.set('coverage', v ? '1' : '0')
    window.history.replaceState(window.history.state, '', url)
  })
}
