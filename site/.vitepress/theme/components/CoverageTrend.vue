<script setup>
// Line and branch coverage over time, from the history the coverage job
// records on the `coverage-history` branch (see history.json in the report
// data). One point per run, placed by when it ran rather than by its position
// in the list - runs are twice-weekly plus whatever ad-hoc dispatches happen,
// and spacing them evenly would imply a regularity the data doesn't have.
//
// The y-axis is padded around the data rather than anchored at zero: coverage
// lives in a narrow band near the top, and a 0-100 axis would flatten every
// movement worth looking at. Nothing is filled under the lines, which is the
// combination that would make a non-zero baseline read as bigger than it is.
import { computed, ref } from 'vue'

const props = defineProps({
  history: { type: Array, required: true },
})

const W = 720
const H = 260
const PAD = { top: 18, right: 92, bottom: 34, left: 44 }

function rate(covered, valid) {
  return valid > 0 ? (covered * 100) / valid : 0
}

const points = computed(() =>
  props.history
    .map(run => ({
      t: Date.parse(run.timestamp),
      timestamp: run.timestamp,
      runId: run.runId,
      event: run.event,
      note: run.note,
      lines: rate(run.linesCovered, run.linesValid),
      branches: rate(run.branchesCovered, run.branchesValid),
      linesValid: run.linesValid,
    }))
    .filter(p => Number.isFinite(p.t))
    .sort((a, b) => a.t - b.t)
)

const annotated = computed(() => points.value.filter(p => p.note))

const xDomain = computed(() => {
  const ts = points.value.map(p => p.t)
  const lo = Math.min(...ts)
  const hi = Math.max(...ts)
  return hi > lo ? [lo, hi] : [lo - 86400000, lo + 86400000]
})

const yDomain = computed(() => {
  const all = points.value.flatMap(p => [p.lines, p.branches])
  const lo = Math.max(0, Math.floor(Math.min(...all) - 2))
  const hi = Math.min(100, Math.ceil(Math.max(...all) + 2))
  return hi > lo ? [lo, hi] : [Math.max(0, lo - 1), Math.min(100, lo + 1)]
})

function x(t) {
  const [lo, hi] = xDomain.value
  return PAD.left + ((t - lo) / (hi - lo)) * (W - PAD.left - PAD.right)
}

function y(v) {
  const [lo, hi] = yDomain.value
  return H - PAD.bottom - ((v - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom)
}

function path(key) {
  return points.value.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.t)} ${y(p[key])}`).join(' ')
}

const yTicks = computed(() => {
  const [lo, hi] = yDomain.value
  const step = Math.max(1, Math.round((hi - lo) / 4))
  const ticks = []
  for (let v = lo; v <= hi; v += step) ticks.push(v)
  return ticks
})

const xTicks = computed(() => {
  const ps = points.value
  if (ps.length <= 1) return ps
  const want = Math.min(5, ps.length)
  // Deduplicated on the rendered label rather than the timestamp: several
  // runs a day is normal here (the schedule plus any ad-hoc dispatch), and
  // two ticks a few pixels apart both reading "9 Aug" print on top of
  // each other.
  const seen = new Set()
  const ticks = []
  for (let i = 0; i < want; i++) {
    const p = ps[Math.round((i * (ps.length - 1)) / (want - 1))]
    const label = shortDate(p.t)
    if (!seen.has(label)) { seen.add(label); ticks.push(p) }
  }
  return ticks
})

function shortDate(t) {
  return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function pct(v) {
  return `${v.toFixed(1)}%`
}

const last = computed(() => points.value[points.value.length - 1])

const hovered = ref(null)

function onMove(event) {
  const box = event.currentTarget.getBoundingClientRect()
  const at = ((event.clientX - box.left) / box.width) * W

  let best = null
  let bestDistance = Infinity
  for (const p of points.value) {
    const d = Math.abs(x(p.t) - at)
    if (d < bestDistance) { bestDistance = d; best = p }
  }
  hovered.value = best
}

// Percentage across the plot, so the HTML tooltip tracks a point whose SVG
// position is in viewBox units the page never sees.
const tooltipLeft = computed(() => (hovered.value ? (x(hovered.value.t) / W) * 100 : 0))
</script>

<template>
  <section class="trend" v-if="points.length > 0">
    <header>
      <h2>Coverage over time</h2>
      <div class="legend">
        <span class="key"><i class="swatch lines"></i>lines</span>
        <span class="key"><i class="swatch branches"></i>branches</span>
      </div>
    </header>

    <p v-if="points.length === 1" class="single">
      One run recorded so far, on {{ shortDate(points[0].t) }}:
      {{ pct(points[0].lines) }} of lines, {{ pct(points[0].branches) }} of branches.
      A trend needs a second.
    </p>

    <div v-else class="plot" @mousemove="onMove" @mouseleave="hovered = null">
      <svg :viewBox="`0 0 ${W} ${H}`" role="img"
           aria-label="Line and branch coverage for each recorded run, over time">
        <g class="grid">
          <template v-for="t in yTicks" :key="t">
            <line :x1="PAD.left" :x2="W - PAD.right" :y1="y(t)" :y2="y(t)" />
            <text :x="PAD.left - 8" :y="y(t) + 4" text-anchor="end">{{ t }}%</text>
          </template>
        </g>

        <g class="xaxis">
          <text v-for="p in xTicks" :key="p.t" :x="x(p.t)" :y="H - PAD.bottom + 18"
                text-anchor="middle">{{ shortDate(p.t) }}</text>
        </g>

        <!-- A run whose numbers are not comparable with the one before it:
             the step at this point is a change in counting, not in coverage. -->
        <g class="break">
          <line v-for="p in annotated" :key="p.runId"
                :x1="x(p.t)" :x2="x(p.t)" :y1="PAD.top" :y2="H - PAD.bottom" />
        </g>

        <line v-if="hovered" class="crosshair"
              :x1="x(hovered.t)" :x2="x(hovered.t)" :y1="PAD.top" :y2="H - PAD.bottom" />

        <path class="series lines" :d="path('lines')" />
        <path class="series branches" :d="path('branches')" />

        <g class="markers">
          <circle v-for="p in points" :key="`l${p.runId}`" class="lines"
                  :cx="x(p.t)" :cy="y(p.lines)" :r="hovered === p ? 5 : 3.5" />
          <circle v-for="p in points" :key="`b${p.runId}`" class="branches"
                  :cx="x(p.t)" :cy="y(p.branches)" :r="hovered === p ? 5 : 3.5" />
        </g>

        <g class="direct">
          <text :x="x(last.t) + 10" :y="y(last.lines) + 4" class="lines">{{ pct(last.lines) }} lines</text>
          <text :x="x(last.t) + 10" :y="y(last.branches) + 4" class="branches">{{ pct(last.branches) }} branches</text>
        </g>
      </svg>

      <div v-if="hovered" class="tooltip" :style="{ left: `${tooltipLeft}%` }">
        <div class="when">{{ shortDate(hovered.t) }} &middot; {{ hovered.event }}</div>
        <div><i class="swatch lines"></i>{{ pct(hovered.lines) }} of {{ hovered.linesValid }} lines</div>
        <div><i class="swatch branches"></i>{{ pct(hovered.branches) }} of branches</div>
        <div v-if="hovered.note" class="note">{{ hovered.note }}</div>
      </div>
    </div>

    <p v-for="p in annotated" :key="p.runId" class="footnote">
      <strong>{{ shortDate(p.t) }}:</strong> {{ p.note }}
    </p>

    <details>
      <summary>The numbers behind this chart</summary>
      <table>
        <thead>
          <tr><th>run</th><th>date</th><th>trigger</th><th>lines</th><th>branches</th></tr>
        </thead>
        <tbody>
          <tr v-for="p in [...points].reverse()" :key="p.runId">
            <td>{{ p.runId }}</td>
            <td>{{ shortDate(p.t) }}</td>
            <td>{{ p.event }}</td>
            <td>{{ pct(p.lines) }}</td>
            <td>{{ pct(p.branches) }}</td>
          </tr>
        </tbody>
      </table>
    </details>
  </section>
</template>

<style scoped>
/* Two categorical hues, deliberately not the green/amber/red the report uses
   for coverage bands - those mean "good/middling/bad" everywhere else on the
   site and would read as a verdict here rather than as an identity. Both
   pairs are checked for colour-vision separation against their own surface. */
.trend {
  --series-lines: #3178c6;
  --series-branches: #c2255c;
}

:global(html.dark) .trend {
  --series-lines: #4d97e8;
  --series-branches: #e05a86;
}

.trend {
  margin: 8px 0 32px;
  max-width: 760px;
}

header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

h2 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px;
  border: 0;
  padding: 0;
}

.legend {
  display: flex;
  gap: 14px;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.key {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.swatch {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  display: inline-block;
}

.swatch.lines { background: var(--series-lines); }
.swatch.branches { background: var(--series-branches); }

.plot {
  position: relative;
}

svg {
  width: 100%;
  height: auto;
  display: block;
  overflow: visible;
}

.grid line {
  stroke: var(--vp-c-divider);
  stroke-width: 1;
}

.grid text,
.xaxis text {
  fill: var(--vp-c-text-3);
  font-size: 11px;
}

.break line {
  stroke: var(--vp-c-text-3);
  stroke-width: 1;
  stroke-dasharray: 3 4;
  opacity: 0.7;
}

.crosshair {
  stroke: var(--vp-c-text-3);
  stroke-width: 1;
  opacity: 0.5;
}

.series {
  fill: none;
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.series.lines { stroke: var(--series-lines); }
.series.branches { stroke: var(--series-branches); }

.markers circle {
  stroke: var(--vp-c-bg);
  stroke-width: 2;
}

.markers circle.lines { fill: var(--series-lines); }
.markers circle.branches { fill: var(--series-branches); }

.direct text {
  font-size: 11px;
  font-weight: 600;
}

.direct text.lines { fill: var(--series-lines); }
.direct text.branches { fill: var(--series-branches); }

.tooltip {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  pointer-events: none;
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 12px;
  line-height: 1.6;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgb(0 0 0 / 12%);
}

.tooltip .swatch {
  margin-right: 6px;
}

.tooltip .when {
  color: var(--vp-c-text-2);
  margin-bottom: 2px;
}

.tooltip .note {
  white-space: normal;
  max-width: 260px;
  color: var(--vp-c-text-2);
  margin-top: 4px;
}

.single,
.footnote {
  font-size: 13px;
  color: var(--vp-c-text-2);
}

details {
  margin-top: 12px;
  font-size: 13px;
}

summary {
  cursor: pointer;
  color: var(--vp-c-text-2);
}

table {
  margin-top: 8px;
  display: block;
  overflow-x: auto;
}
</style>
