// Shared by FileExplorer.vue and ExplorerDir.vue - keep in sync with
// files/[slug].paths.js's own slug derivation and CoverageIndex.vue's
// fileLink().
import { withBase } from 'vitepress'

export function rate(covered, valid) {
  return valid > 0 ? covered / valid : 1
}

export function rateClass(x) {
  if (x >= 0.8) return 'rate-high'
  if (x >= 0.5) return 'rate-mid'
  return 'rate-low'
}

export function fileLink(file, line) {
  const slug = file.replace(/\//g, '__').replace(/\.ghul$/, '')
  return withBase(`/files/${slug}${line ? '#L' + line : ''}`)
}
