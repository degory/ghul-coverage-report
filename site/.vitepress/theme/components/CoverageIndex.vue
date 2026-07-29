<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  summary: { type: Object, required: true },
})

function rate(covered, valid) {
  return valid > 0 ? covered / valid : 1
}

function pct(x) {
  return `${(x * 100).toFixed(1)}%`
}

// Matches the flattening files/[slug].paths.js uses to name each
// generated file page.
function slugFor(file) {
  return file.replace(/\//g, '__').replace(/\.ghul$/, '')
}

const typeRows = computed(() => {
  const rows = []
  for (const ns of props.summary.namespaces) {
    for (const t of ns.types) {
      rows.push({
        namespace: ns.name,
        type: t.name || '(global functions)',
        file: t.file,
        startLine: t.startLine,
        linesCovered: t.linesCovered,
        linesValid: t.linesValid,
        branchesCovered: t.branchesCovered,
        branchesValid: t.branchesValid,
        rate: rate(t.linesCovered, t.linesValid),
      })
    }
  }
  return rows
})

const methodRows = computed(() => {
  const rows = []
  for (const ns of props.summary.namespaces) {
    for (const t of ns.types) {
      for (const m of t.methods) {
        rows.push({
          namespace: ns.name,
          type: t.name || '(global functions)',
          method: m.name,
          file: m.file,
          startLine: m.startLine,
          linesCovered: m.linesCovered,
          linesValid: m.linesValid,
          branchesCovered: m.branchesCovered,
          branchesValid: m.branchesValid,
          rate: rate(m.linesCovered, m.linesValid),
        })
      }
    }
  }
  return rows
})

// The selected view lives in the URL (?view=...), not just component
// state: state alone resets on every navigation, including the ordinary
// case of following a row link into a file page and clicking "back". A
// `replaceState` (not `pushState`) on every change means it never adds its
// own history entries - by the time a link into a file page is clicked,
// the current history entry already carries the right `view`, so browser
// back restores both the selection and (natively) the scroll position.
function currentView() {
  if (typeof window === 'undefined') return 'type-desc'
  return new URLSearchParams(window.location.search).get('view') || 'type-desc'
}

const view = ref(currentView())

watch(view, newView => {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  url.searchParams.set('view', newView)
  window.history.replaceState(window.history.state, '', url)
})

const sortedTypeRows = computed(() => {
  const ascending = view.value === 'type-asc'
  return [...typeRows.value].sort((a, b) => ascending ? a.rate - b.rate : b.rate - a.rate)
})

const groupedMethodRows = computed(() => {
  const dir = view.value === 'method-asc' ? 1 : -1
  const rows = [...methodRows.value].sort((a, b) => dir * (a.rate - b.rate))

  const groups = new Map()
  for (const r of rows) {
    const key = `${r.namespace}|${r.type}`
    if (!groups.has(key)) {
      groups.set(key, { namespace: r.namespace, type: r.type, rows: [] })
    }
    groups.get(key).rows.push(r)
  }

  const groupList = [...groups.values()]
  groupList.sort((a, b) => {
    const ar = a.rows[0]?.rate ?? 0
    const br = b.rows[0]?.rate ?? 0
    return dir === 1 ? ar - br : br - ar
  })
  return groupList
})

const totals = computed(() => props.summary.totals)
const lineRate = computed(() => rate(totals.value.linesCovered, totals.value.linesValid))
const branchRate = computed(() => rate(totals.value.branchesCovered, totals.value.branchesValid))
</script>

<template>
  <div class="coverage-index">
    <div class="headline">
      <div class="card">
        <div class="label">Line coverage</div>
        <div class="value">{{ pct(lineRate) }}</div>
        <div class="detail">{{ totals.linesCovered }} / {{ totals.linesValid }} lines</div>
      </div>
      <div class="card">
        <div class="label">Branch coverage</div>
        <div class="value">{{ pct(branchRate) }}</div>
        <div class="detail">{{ totals.branchesCovered }} / {{ totals.branchesValid }} branches</div>
      </div>
    </div>

    <label class="view-select">
      View:
      <select v-model="view">
        <option value="type-desc">By type, descending</option>
        <option value="type-asc">By type, ascending</option>
        <option value="method-desc">By method, grouped by namespace/type, descending</option>
        <option value="method-asc">By method, grouped by namespace/type, ascending</option>
      </select>
    </label>

    <table v-if="view === 'type-desc' || view === 'type-asc'" class="coverage-table">
      <thead>
        <tr><th>Type</th><th>Namespace</th><th>Lines</th><th>Branches</th></tr>
      </thead>
      <tbody>
        <tr v-for="row in sortedTypeRows" :key="row.namespace + '.' + row.type">
          <td><a :href="`/files/${slugFor(row.file)}${row.startLine ? '#L' + row.startLine : ''}`">{{ row.type }}</a></td>
          <td>{{ row.namespace }}</td>
          <td>{{ pct(row.rate) }} ({{ row.linesCovered }}/{{ row.linesValid }})</td>
          <td>{{ row.branchesValid ? pct(row.branchesCovered / row.branchesValid) : '—' }}</td>
        </tr>
      </tbody>
    </table>

    <div v-else v-for="group in groupedMethodRows" :key="group.namespace + '.' + group.type" class="method-group">
      <h3>{{ group.namespace }}.{{ group.type }}</h3>
      <table class="coverage-table">
        <thead><tr><th>Method</th><th>Lines</th><th>Branches</th></tr></thead>
        <tbody>
          <tr v-for="row in group.rows" :key="row.file + row.startLine + row.method">
            <td><a :href="`/files/${slugFor(row.file)}#L${row.startLine}`">{{ row.method }}</a></td>
            <td>{{ pct(row.rate) }} ({{ row.linesCovered }}/{{ row.linesValid }})</td>
            <td>{{ row.branchesValid ? pct(row.branchesCovered / row.branchesValid) : '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.coverage-index {
  padding: 0 24px;
}

.coverage-index a {
  text-decoration: underline;
  text-decoration-color: var(--vp-c-divider);
  text-underline-offset: 2px;
}

.coverage-index a:hover {
  text-decoration-color: currentColor;
}

.headline {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 16px 24px;
}

.label {
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.value {
  font-size: 28px;
  font-weight: 600;
}

.detail {
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.view-select {
  display: block;
  margin-bottom: 16px;
}

.coverage-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 24px;
}

.coverage-table th, .coverage-table td {
  text-align: left;
  padding: 4px 8px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.method-group h3 {
  margin-bottom: 4px;
  font-family: 'Fira Code', var(--vp-font-family-mono);
  font-feature-settings: 'calt' 1, 'liga' 1, 'ss07' 1;
  font-size: 14px;
}
</style>
