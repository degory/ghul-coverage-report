<script setup>
import { ref, computed, watch } from 'vue'
import { withBase } from 'vitepress'
import { coverageMode } from '../coverage-mode.mjs'

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
// generated file page. withBase() prepends the site's deploy-time base
// path (vitepress.config.mts) - this is a GitHub Pages *project* site
// (degory.github.io/<repo>/), so an unprefixed absolute path resolves to
// the wrong origin-root URL entirely.
function fileLink(file, line) {
  const slug = file.replace(/\//g, '__').replace(/\.ghul$/, '')
  return withBase(`/files/${slug}${line ? '#L' + line : ''}`)
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
          signature: m.signature,
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

// Grouping and ordering live in the URL (?group=, ?order=), not just
// component state: state alone resets on every navigation, including the
// ordinary case of following a row link into a file page and clicking
// "back". A `replaceState` (not `pushState`) on every change means it
// never adds its own history entries - by the time a link into a file page
// is clicked, the current history entry already carries them, so browser
// back restores the selection and (natively) the scroll position.
function param(name, fallback) {
  if (typeof window === 'undefined') return fallback
  return new URLSearchParams(window.location.search).get(name) || fallback
}

// Default is worst-first by *absolute* missed lines, the ordering JaCoCo
// opens on. Percentage-ordering is the obvious choice and the wrong one:
// it puts a three-line 0% helper above a four-hundred-line 60% core class,
// where the second is far more of the project's untested surface. Ordering
// by rate is still offered, it just isn't what you land on.
const group = ref(param('group', 'type'))
const order = ref(param('order', 'missed'))

function syncUrl(name, value) {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  url.searchParams.set(name, value)
  window.history.replaceState(window.history.state, '', url)
}

watch(group, v => syncUrl('group', v))
watch(order, v => syncUrl('order', v))

function missed(row) {
  return row.linesValid - row.linesCovered
}

function compare(a, b) {
  if (order.value === 'missed') return missed(b) - missed(a)
  if (order.value === 'rate-asc') return a.rate - b.rate
  return b.rate - a.rate
}

const sortedTypeRows = computed(() => [...typeRows.value].sort(compare))

const fileRows = computed(() => {
  const byFile = new Map()
  for (const row of typeRows.value) {
    if (!byFile.has(row.file)) {
      byFile.set(row.file, {
        file: row.file,
        linesCovered: 0,
        linesValid: 0,
        branchesCovered: 0,
        branchesValid: 0,
      })
    }
    const f = byFile.get(row.file)
    f.linesCovered += row.linesCovered
    f.linesValid += row.linesValid
    f.branchesCovered += row.branchesCovered
    f.branchesValid += row.branchesValid
  }
  return [...byFile.values()].map(f => ({ ...f, rate: rate(f.linesCovered, f.linesValid) }))
})

const sortedFileRows = computed(() => [...fileRows.value].sort(compare))

const groupedMethodRows = computed(() => {
  const rows = [...methodRows.value].sort(compare)

  const groups = new Map()
  for (const r of rows) {
    const key = `${r.namespace}|${r.type}`
    if (!groups.has(key)) {
      groups.set(key, { namespace: r.namespace, type: r.type, rows: [] })
    }
    groups.get(key).rows.push(r)
  }

  // Each group ranks by its own best-ranked member, so the ordering the
  // rows were just given carries up to the groups containing them.
  return [...groups.values()].sort((a, b) => compare(a.rows[0], b.rows[0]))
})

const totals = computed(() => props.summary.totals)
const lineRate = computed(() => rate(totals.value.linesCovered, totals.value.linesValid))
const branchRate = computed(() => rate(totals.value.branchesCovered, totals.value.branchesValid))
</script>

<template>
  <div class="coverage-index">
    <button class="browse-link" @click="coverageMode = false">&larr; Browse source</button>

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

    <div class="view-select">
      <label>
        Group by:
        <select v-model="group">
          <option value="type">Type</option>
          <option value="file">File</option>
          <option value="method">Method, grouped by namespace/type</option>
        </select>
      </label>
      <label>
        Order by:
        <select v-model="order">
          <option value="missed">Most uncovered lines first</option>
          <option value="rate-asc">Lowest coverage first</option>
          <option value="rate-desc">Highest coverage first</option>
        </select>
      </label>
    </div>

    <div v-if="group === 'type'" class="table-scroll">
    <table class="coverage-table">
      <thead>
        <tr><th>Type</th><th>Namespace</th><th class="num">Missed</th><th>Lines</th><th>Branches</th></tr>
      </thead>
      <tbody>
        <tr v-for="row in sortedTypeRows" :key="row.namespace + '.' + row.type">
          <td><a :href="fileLink(row.file, row.startLine)">{{ row.type }}</a></td>
          <td>{{ row.namespace }}</td>
          <td class="num">{{ missed(row) || '' }}</td>
          <td>{{ pct(row.rate) }} ({{ row.linesCovered }}/{{ row.linesValid }})</td>
          <td>{{ row.branchesValid ? pct(row.branchesCovered / row.branchesValid) : '—' }}</td>
        </tr>
      </tbody>
    </table>
    </div>

    <div v-else-if="group === 'file'" class="table-scroll">
    <table class="coverage-table">
      <thead>
        <tr><th>File</th><th class="num">Missed</th><th>Lines</th><th>Branches</th></tr>
      </thead>
      <tbody>
        <tr v-for="row in sortedFileRows" :key="row.file">
          <td class="mono-cell"><a :href="fileLink(row.file)">{{ row.file }}</a></td>
          <td class="num">{{ missed(row) || '' }}</td>
          <td>{{ pct(row.rate) }} ({{ row.linesCovered }}/{{ row.linesValid }})</td>
          <td>{{ row.branchesValid ? pct(row.branchesCovered / row.branchesValid) : '—' }}</td>
        </tr>
      </tbody>
    </table>
    </div>

    <div v-else v-for="group in groupedMethodRows" :key="group.namespace + '.' + group.type" class="method-group">
      <h3>{{ group.namespace }}.{{ group.type }}</h3>
      <div class="table-scroll">
      <table class="coverage-table">
        <thead><tr><th>Method</th><th class="num">Missed</th><th>Lines</th><th>Branches</th></tr></thead>
        <tbody>
          <tr v-for="row in group.rows" :key="row.file + row.startLine + row.method">
            <td><a :href="fileLink(row.file, row.startLine)" :title="row.signature">{{ row.method }}</a></td>
            <td class="num">{{ missed(row) || '' }}</td>
            <td>{{ pct(row.rate) }} ({{ row.linesCovered }}/{{ row.linesValid }})</td>
            <td>{{ row.branchesValid ? pct(row.branchesCovered / row.branchesValid) : '—' }}</td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.coverage-index {
  padding: 0 24px;
  padding-left: calc(24px + var(--explorer-inset));
}

.coverage-index a {
  text-decoration: underline;
  text-decoration-color: var(--vp-c-divider);
  text-underline-offset: 2px;
}

.coverage-index a:hover {
  text-decoration-color: currentColor;
}

.browse-link {
  display: inline-block;
  margin-bottom: 12px;
  font-size: 14px;
  background: none;
  border: none;
  padding: 0;
  color: var(--vp-c-brand-1);
  cursor: pointer;
  text-decoration: underline;
  text-decoration-color: var(--vp-c-divider);
  text-underline-offset: 2px;
}

.browse-link:hover {
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
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 16px;
  font-size: 14px;
}

.view-select select {
  margin-left: 4px;
}

.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* Five columns of numbers plus a fully-qualified type name overflow a
   narrow screen, and a table that widens the document makes the browser fit
   the whole page to the table's width - so each table sits in its own
   scroller (.table-scroll) rather than stretching the document. */
.table-scroll {
  overflow-x: auto;
  max-width: 100%;
  margin-bottom: 24px;
}

.coverage-table {
  width: 100%;
  border-collapse: collapse;
}

.coverage-table th, .coverage-table td {
  text-align: left;
  padding: 4px 8px;
  border-bottom: 1px solid var(--vp-c-divider);
}

/* After the shared rule above, so the numeric column wins over it. */
.coverage-table th.num, .coverage-table td.num {
  text-align: right;
}

.mono-cell {
  font-family: 'Fira Code', var(--vp-font-family-mono);
  font-feature-settings: 'calt' 1, 'liga' 1, 'ss07' 1;
  font-size: 13px;
}

.method-group h3 {
  margin-bottom: 4px;
  font-family: 'Fira Code', var(--vp-font-family-mono);
  font-feature-settings: 'calt' 1, 'liga' 1, 'ss07' 1;
  font-size: 14px;
}
</style>
