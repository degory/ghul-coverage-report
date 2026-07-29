<script setup>
// `line.segments` (colour + semantic-token runs) is computed at build time
// by ../../.vitepress/highlight.mjs, ported from ghul-dev's GhulExample.vue
// / ghulExampleDataPlugin - see that file for the origin note. This
// component just renders the already-merged runs plus the coverage gutter.
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
          <td class="text"><pre><span v-for="(segment, i) in line.segments" :key="i" :style="segment.style" :class="[segment.semanticType ? 'ghul-sem-' + segment.semanticType : null, segment.semanticStatic ? 'ghul-sem-mod-static' : null]">{{ segment.text }}</span></pre></td>
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
