<script setup>
// `line.segments` (colour + semantic-token + hover runs) is computed at
// build time by ../../.vitepress/highlight.mjs, ported from ghul-dev's
// GhulExample.vue / ghulExampleDataPlugin - see that file for the origin
// note. This component renders the already-merged runs plus the coverage
// gutter, and the hover tooltip (also ported from GhulExample.vue).
//
// Renders text runs with CSS `white-space: pre` rather than an actual
// `<pre>` tag, deliberately: Vue's template compiler only special-cases
// whitespace preservation for the literal `<pre>`/`<textarea>` tags, so a
// styled `<div>` still gets normal whitespace-condensing on the *template
// source* (safe to format normally) while still rendering the *data*
// (each segment's own text) literally via the CSS property.
import { ref } from 'vue'

const props = defineProps({
  path: { type: String, required: true },
  lines: { type: Array, required: true },
  // Deduplicated {kindLabel, signatureLines} table; each segment carries
  // just the small integer index into it (see paths.js's buildHoverTable).
  hovers: { type: Array, default: () => [] },
})

function lineClass(line) {
  if (line.hits == null) return 'cov-na'
  return line.hits > 0 ? 'cov-hit' : 'cov-miss'
}

function branchLabel(line) {
  if (line.branchTotal == null) return ''
  return `${line.branchCovered}/${line.branchTotal}`
}

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

function onEnter(event, segment) {
  if (segment.hoverIndex == null) return

  const hover = props.hovers[segment.hoverIndex]
  if (!hover) return

  tip.value = {
    show: true,
    signatureLines: hover.signatureLines ?? [],
    kindLabel: hover.kindLabel ?? '',
    style: place(event),
  }
}

function onLeave(segment) {
  if (segment.hoverIndex != null) {
    tip.value = { ...tip.value, show: false }
  }
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
          <td class="text">
            <div class="line-text">
              <span
                v-for="(segment, i) in line.segments"
                :key="i"
                :style="segment.style"
                :class="[
                  segment.semanticType ? 'ghul-sem-' + segment.semanticType : null,
                  segment.semanticStatic ? 'ghul-sem-mod-static' : null,
                  { 'has-hover': segment.hoverIndex != null },
                ]"
                @mouseenter="onEnter($event, segment)"
                @mouseleave="onLeave(segment)"
              >{{ segment.text }}</span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <Teleport to="body">
      <div v-if="tip.show" class="coverage-tooltip" :style="tip.style">
        <div class="tooltip-signature">
          <div v-for="(sigLine, li) in tip.signatureLines" :key="li" class="line-text">
            <span v-for="(tok, ti) in sigLine" :key="ti" :style="tok.style">{{ tok.text }}</span>
          </div>
        </div>
        <div v-if="tip.kindLabel" class="tooltip-kind">{{ tip.kindLabel }}</div>
      </div>
    </Teleport>
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

.line-text {
  white-space: pre;
}

.has-hover {
  cursor: help;
  text-decoration: underline dotted rgba(128, 128, 128, 0.6);
  text-underline-offset: 3px;
}

.cov-hit {
  background: rgba(46, 160, 67, 0.15);
}

.cov-miss {
  background: rgba(248, 81, 73, 0.15);
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
  font-family: var(--vp-font-family-mono);
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
