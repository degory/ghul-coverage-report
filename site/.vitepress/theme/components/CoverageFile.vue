<script setup>
// Each line's segments (colour + semantic-token + hover runs) are computed
// at build time by ../../.vitepress/highlight.mjs, ported from ghul-dev's
// GhulExample.vue / ghulExampleDataPlugin - see that file for the origin
// note. This component renders the already-merged runs plus the coverage
// stripe, and the hover tooltip (also ported from GhulExample.vue).
//
// Renders text runs with CSS `white-space: pre` rather than an actual
// `<pre>` tag, deliberately: Vue's template compiler only special-cases
// whitespace preservation for the literal `<pre>`/`<textarea>` tags, so a
// styled `<div>` still gets normal whitespace-condensing on the *template
// source* (safe to format normally) while still rendering the *data*
// (each segment's own text) literally via the CSS property.
import { ref, computed } from 'vue'
import { withBase } from 'vitepress'

const props = defineProps({
  path: { type: String, required: true },
  // Terse per-line shape from files/[slug].paths.js: {n, g[, h, bc, bt]},
  // segments {t[, s, c, h]} - see highlight.mjs's mergeLine for the key
  // meanings and why they're spelled this short.
  lines: { type: Array, required: true },
  // Deduplicated {kindLabel, signatureLines} table; each segment carries
  // just the small integer index into it (see paths.js's buildHoverTable).
  hovers: { type: Array, default: () => [] },
  // Interned {--shiki-light, --shiki-dark} pairs; a segment's `s` indexes
  // into this (see highlight.mjs's createStylePalette).
  styles: { type: Array, default: () => [] },
})

// Coverage is a thin stripe in its own narrow lane, never a tint on the
// code, and the counts live in the stripe's tooltip rather than in columns
// of their own. Syntax highlighting and hovers are untouched by any of it -
// they apply to every line regardless of coverage.
//
// Three states, matching what the data can actually distinguish:
//   miss     the line was instrumented and never ran
//   partial  it ran, but not every branch on it did
//   hit      it ran, and every branch on it did (or it has none)
// A line with no `h` at all is not instrumented - a comment, a blank, a
// declaration that emits no code - and gets no stripe. The lane still
// occupies its width so the code column stays aligned down the file.
function covClass(line) {
  if (line.h == null) return null
  if (line.h === 0) return 'cov-miss'
  return line.bt != null && line.bc < line.bt ? 'cov-part' : 'cov-hit'
}

function covTitle(line) {
  if (line.h == null) return null

  const visits = line.h === 1 ? '1 visit' : `${line.h} visits`
  const branches = line.bt != null ? `, ${line.bc} of ${line.bt} branches` : ''

  if (line.h === 0) return `Not covered${line.bt != null ? ` (0 of ${line.bt} branches)` : ''}`
  return `Covered - ${visits}${branches}`
}

// Precomputed once per file rather than per render: these are pure
// functions of immutable props, and the largest source files here run to
// several thousand lines.
const rows = computed(() => props.lines.map(line => ({
  n: line.n,
  g: line.g,
  cov: covClass(line),
  title: covTitle(line),
})))

// A single shared tooltip, teleported to <body> and positioned fixed, so
// it's never clipped by the table's overflow.
const tip = ref({ show: false, signatureLines: [], kindLabel: '', style: {} })

function place(event) {
  const rect = event.currentTarget.getBoundingClientRect()
  const maxWidth = 640

  const style = {
    left: Math.max(8, Math.min(rect.left, window.innerWidth - maxWidth - 16)) + 'px',
  }

  if (rect.bottom + 220 > window.innerHeight) {
    style.bottom = (window.innerHeight - rect.top + 6) + 'px'
  } else {
    style.top = (rect.bottom + 6) + 'px'
  }

  return style
}

// One delegated listener pair on the table, rather than a handler bound to
// each span: a large source file runs to several thousand segments, and
// binding enter/leave per span made that ~10k listeners on a page whose
// hover targets are a small minority of them. The index rides on a
// data-attribute so the delegated handler can recover it from the event
// target alone.
function onOver(event) {
  const span = event.target.closest?.('span[data-h]')
  if (!span) return

  const hover = props.hovers[Number(span.dataset.h)]
  if (!hover) return

  tip.value = {
    show: true,
    signatureLines: hover.signatureLines ?? [],
    kindLabel: hover.kindLabel ?? '',
    style: place({ currentTarget: span }),
  }
}

function onOut(event) {
  if (event.target.closest?.('span[data-h]')) {
    tip.value = { ...tip.value, show: false }
  }
}
</script>

<template>
  <div class="coverage-file">
    <a class="back-link" :href="withBase('/')">&larr; Back</a>
    <h1 class="file-path">{{ path }}</h1>
    <table class="coverage-source" @mouseover="onOver" @mouseout="onOut">
      <tbody>
        <tr v-for="row in rows" :key="row.n" :id="`L${row.n}`">
          <td class="ln">{{ row.n }}</td>
          <td class="cov"><span :class="row.cov" :title="row.title"></span></td>
          <td class="text">
            <div class="line-text">
              <span
                v-for="(segment, i) in row.g"
                :key="i"
                :style="segment.s != null ? styles[segment.s] : null"
                :class="['ghul-tok', segment.c]"
                :data-h="segment.h"
              >{{ segment.t }}</span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <Teleport to="body">
      <div v-if="tip.show" class="coverage-tooltip" :style="tip.style">
        <div class="tooltip-signature">
          <div v-for="(sigLine, li) in tip.signatureLines" :key="li" class="line-text">
            <span v-for="(tok, ti) in sigLine" :key="ti" class="ghul-tok" :style="tok.s != null ? styles[tok.s] : null">{{ tok.t }}</span>
          </div>
        </div>
        <div v-if="tip.kindLabel" class="tooltip-kind">{{ tip.kindLabel }}</div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.coverage-file {
  padding: 0 16px;
}

.back-link {
  display: inline-block;
  margin-bottom: 12px;
  font-size: 14px;
}

.file-path {
  font-family: 'Fira Code', var(--vp-font-family-mono);
  font-feature-settings: 'calt' 1, 'liga' 1, 'ss07' 1;
  font-size: 16px;
  word-break: break-all;
}

.coverage-source {
  width: 100%;
  border-collapse: collapse;
  font-family: 'Fira Code', var(--vp-font-family-mono);
  font-feature-settings: 'calt' 1, 'liga' 1, 'ss07' 1;
  font-size: 13px;
  line-height: 1.5;
}

.ln, .cov, .text {
  line-height: 1.5;
  vertical-align: top;
}

.ln {
  text-align: right;
  padding: 0 8px;
  color: var(--vp-c-text-3);
  user-select: none;
  white-space: nowrap;
}

/* The coverage lane: 8px wide whatever it holds, so the code column keeps
   a straight left edge past lines that carry no coverage data. */
.cov {
  width: 8px;
  padding: 0;
  user-select: none;
}

.cov > span {
  display: block;
  width: 4px;
  height: 1.5em;
  margin: 0 2px;
}

.text {
  width: 100%;
}

.line-text {
  white-space: pre;
  /* A wholly empty line has no inline content to anchor a line box to, so
     the row collapses shorter than its neighbours without this - blank
     source lines are common enough to matter. */
  min-height: 1.5em;
}

/* Shiki's tokens carry colour as CSS custom properties (`--shiki-light` /
   `--shiki-dark`) rather than a `color` directly, so the same markup can
   answer both themes - the theme has to actually consume them somewhere.
   `.ghul-sem-*` below overrides this with a `color` of its own for
   identifiers the semantic-token overlay covers. */
.ghul-tok {
  color: var(--shiki-light);
}

.dark .ghul-tok {
  color: var(--shiki-dark);
}

.ghul-tok[data-h] {
  cursor: default;
}

.cov-hit {
  background: #2ea043;
}

.cov-miss {
  background: #f85149;
}

/* Partial gets a hatch as well as its own hue - the three states have to
   stay distinguishable in greyscale and to a colour-blind reader, and this
   is the one that would otherwise read as "some shade of covered". */
.cov-part {
  background: repeating-linear-gradient(
    45deg,
    #d29922,
    #d29922 2px,
    rgba(210, 153, 34, 0.35) 2px,
    rgba(210, 153, 34, 0.35) 4px
  );
}

.coverage-tooltip {
  position: fixed;
  z-index: 100;
  max-width: 640px;
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 8px 12px;
  box-shadow: var(--vp-shadow-3);
  font-family: 'Fira Code', var(--vp-font-family-mono);
  font-feature-settings: 'calt' 1, 'liga' 1, 'ss07' 1;
  font-size: 13px;
}

.tooltip-kind {
  margin-top: 4px;
  font-style: italic;
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-base);
  font-size: 12px;
}

/* Ported from ghul-dev's src/.vitepress/theme/components/GhulExample.vue
   (verified VS Code Light+/Dark+ mapping). If ghul-dev's palette changes,
   port the change here too. */
.ghul-sem-namespace      { color: #267F99; }
.ghul-sem-class          { color: #267F99; }
.ghul-sem-interface      { color: #267F99; }
.ghul-sem-struct         { color: #267F99; }
.ghul-sem-enum           { color: #267F99; }
.ghul-sem-typeParameter  { color: #267F99; }
.ghul-sem-enumMember     { color: #0070C1; }
.ghul-sem-method         { color: #795E26; }
.ghul-sem-function       { color: #795E26; }
.ghul-sem-property       { color: #001080; }
.ghul-sem-variable       { color: #001080; }
.ghul-sem-parameter      { color: #001080; }

.dark .ghul-sem-namespace      { color: #4EC9B0; }
.dark .ghul-sem-class          { color: #4EC9B0; }
.dark .ghul-sem-interface      { color: #B8D7A3; }
.dark .ghul-sem-struct         { color: #4EC9B0; }
.dark .ghul-sem-enum           { color: #4EC9B0; }
.dark .ghul-sem-typeParameter  { color: #4EC9B0; }
.dark .ghul-sem-enumMember     { color: #4FC1FF; }
.dark .ghul-sem-method         { color: #DCDCAA; }
.dark .ghul-sem-function       { color: #DCDCAA; }
.dark .ghul-sem-property       { color: #9CDCFE; }
.dark .ghul-sem-variable       { color: #9CDCFE; }
.dark .ghul-sem-parameter      { color: #9CDCFE; }

.ghul-sem-mod-static {
  font-style: italic;
}
</style>
