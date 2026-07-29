// Shared by FileExplorer.vue and ExplorerDir.vue - keep in sync with
// files/[slug].paths.js's own slug derivation and CoverageIndex.vue's
// fileLink().
import { withBase } from 'vitepress'

export function rate(covered, valid) {
  return valid > 0 ? covered / valid : 1
}

// Colour band for the filled portion of a rate bar. Severity only - how
// *much* is covered is carried by the fill length, not by the colour, so
// these bands never have to stand in for the ratio itself.
//
// `measured=false` is a file/entry no suite's instrumentation ever
// touched - distinct from 0% (instrumented, never executed).
function rateClass(x, measured = true) {
  if (!measured) return 'rate-unmeasured'
  if (x >= 0.8) return 'rate-high'
  if (x >= 0.5) return 'rate-mid'
  return 'rate-low'
}

// A bar filled to the covered proportion. A single dot coloured by band
// would state a verdict instead of a ratio: most files in the top band
// still have uncovered lines, so a solid "good" marker in the tree
// contradicts the red lines the source view shows for the same file. A
// partial fill cannot make that claim, so the two agree.
//
// Only an exactly-complete entry gets `is-complete`, the one case where a
// solid bar is accurate.
export function rateBar(x, measured = true) {
  return {
    class: [rateClass(x, measured), x >= 1 ? 'is-complete' : null],
    style: { '--fill': `${(x * 100).toFixed(1)}%` },
  }
}

export function rateTitle(covered, valid, measured = true) {
  if (!measured) return 'no suite touched this file'
  if (valid === 0) return 'no instrumented lines'
  return `${(100 * covered / valid).toFixed(1)}% - ${covered} of ${valid} lines`
}

export function fileLink(file, line) {
  const slug = file.replace(/\//g, '__').replace(/\.ghul$/, '')
  return withBase(`/files/${slug}${line ? '#L' + line : ''}`)
}
