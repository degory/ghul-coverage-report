// Shared by FileExplorer.vue and ExplorerDir.vue - keep in sync with
// files/[slug].paths.js's own slug derivation and CoverageIndex.vue's
// fileLink().
import { withBase } from 'vitepress'

export function rate(covered, valid) {
  return valid > 0 ? covered / valid : 1
}

// `measured=false` is a file/entry no suite's instrumentation ever
// touched - distinct from 0% (instrumented, never executed), which the
// green/yellow/red scale already covers.
export function rateClass(x, measured = true) {
  if (!measured) return 'rate-unmeasured'
  if (x >= 0.8) return 'rate-high'
  if (x >= 0.5) return 'rate-mid'
  return 'rate-low'
}

export function fileLink(file, line) {
  const slug = file.replace(/\//g, '__').replace(/\.ghul$/, '')
  return withBase(`/files/${slug}${line ? '#L' + line : ''}`)
}
