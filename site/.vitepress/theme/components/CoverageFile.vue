<script setup>
// Phase 1: plain source with a coverage gutter, no syntax highlighting yet
// (that's ported from ghul-dev's Shiki + semantic-token pipeline in a
// later phase — see the repo's AGENTS.md).
defineProps({
  path: { type: String, required: true },
  lines: { type: Array, required: true },
})

function lineClass(line) {
  if (line.hits == null) return 'cov-na'
  return line.hits > 0 ? 'cov-hit' : 'cov-miss'
}

function branchLabel(line) {
  if (line.branchTotal == null) return ''
  return `${line.branchCovered}/${line.branchTotal}`
}
</script>

<template>
  <div class="coverage-file">
    <h1 class="file-path">{{ path }}</h1>
    <table class="coverage-source">
      <tbody>
        <tr v-for="line in lines" :key="line.number" :id="`L${line.number}`" :class="lineClass(line)">
          <td class="ln">{{ line.number }}</td>
          <td class="hits">{{ line.hits ?? '' }}</td>
          <td class="branch">{{ branchLabel(line) }}</td>
          <td class="text"><pre>{{ line.text }}</pre></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.file-path {
  font-family: var(--vp-font-family-mono);
  font-size: 16px;
  word-break: break-all;
}

.coverage-source {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  line-height: 1.5;
}

.ln, .hits, .branch {
  text-align: right;
  padding: 0 8px;
  color: var(--vp-c-text-3);
  user-select: none;
  white-space: nowrap;
  vertical-align: top;
}

.text {
  width: 100%;
}

.text pre {
  margin: 0;
  white-space: pre;
}

.cov-hit {
  background: rgba(46, 160, 67, 0.15);
}

.cov-miss {
  background: rgba(248, 81, 73, 0.15);
}
</style>
