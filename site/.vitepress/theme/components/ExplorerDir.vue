<script setup>
// Recursive directory node for FileExplorer.vue's "Files" mode. Vue's SFC
// compiler registers a component under its own filename automatically, so
// this can reference itself as <ExplorerDir> in its own template with no
// manual registration.
import { useRoute } from 'vitepress'
import { rate, rateBar, rateTitle, fileLink } from '../explorer-links.mjs'

defineProps({
  // { dirs: [{name, path, dirs, files}], files: [{name, file, linesCovered, linesValid}] }
  dir: { type: Object, required: true },
  open: { type: Boolean, default: false },
})

const route = useRoute()

function isActive(file) {
  return route.path === fileLink(file)
}
</script>

<template>
  <details v-for="d in dir.dirs" :key="d.path" class="tree-node">
    <summary class="tree-label">
      <span class="tree-toggle"></span>
      {{ d.name }}
    </summary>
    <div class="tree-children">
      <ExplorerDir :dir="d" />
    </div>
  </details>
  <div v-for="f in dir.files" :key="f.file" class="tree-leaf">
    <a class="tree-link" :class="{ active: isActive(f.file) }" :href="fileLink(f.file)">{{ f.name }}</a>
    <span
      class="rate-bar"
      v-bind="rateBar(rate(f.linesCovered, f.linesValid), f.measured)"
      :title="rateTitle(f.linesCovered, f.linesValid, f.measured)"
    ></span>
  </div>
</template>
