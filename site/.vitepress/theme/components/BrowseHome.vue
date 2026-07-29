<script setup>
// The site's default landing view - "browse the source" rather than "look
// at the ranked coverage report" (CoverageIndex.vue). Kept deliberately
// light: a one-line orientation, the two headline numbers for anyone who
// does want them, and a way through to the report, which lives one click
// away rather than competing for the same page. See coverage-mode.mjs for
// how a `?coverage=1` link skips this page and opens on CoverageIndex
// instead.
//
// This is only about where an arriving visitor is put down. The file pages
// annotate coverage either way.
import { coverageMode } from '../coverage-mode.mjs'

defineProps({
  summary: { type: Object, required: true },
})

function rate(covered, valid) {
  return valid > 0 ? covered / valid : 1
}

function pct(x) {
  return `${(x * 100).toFixed(1)}%`
}
</script>

<template>
  <div class="browse-home">
    <h1>ghūl source</h1>
    <p class="lede">
      Browse the compiler's source with syntax highlighting and hover
      signatures, using the file tree on the left. Each file is annotated
      with its test coverage in the left margin.
    </p>

    <button class="coverage-link" @click="coverageMode = true">
      View the ranked coverage report
      <span class="detail">
        {{ pct(rate(summary.totals.linesCovered, summary.totals.linesValid)) }} lines,
        {{ pct(rate(summary.totals.branchesCovered, summary.totals.branchesValid)) }} branches
      </span>
      <span class="arrow">&rarr;</span>
    </button>
  </div>
</template>

<style scoped>
.browse-home {
  padding: 0 24px;
  max-width: 640px;
}

.lede {
  color: var(--vp-c-text-2);
  margin-bottom: 24px;
}

.coverage-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  cursor: pointer;
  font-size: 14px;
  text-align: left;
}

.coverage-link:hover {
  border-color: var(--vp-c-brand-1);
}

.coverage-link .detail {
  color: var(--vp-c-text-3);
  font-size: 12px;
}

.coverage-link .arrow {
  margin-left: auto;
  color: var(--vp-c-text-3);
}
</style>
