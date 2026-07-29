<script setup>
// Persistent left-hand browser, shown on every page via theme/Layout.vue.
// Two modes sharing one tree widget: "Files" (directory tree, from the
// distinct file paths in summary.json, rendered recursively by
// ExplorerDir.vue) and "Outline" (namespace -> type -> method, straight
// from summary.json - only three levels deep, so rendered inline rather
// than recursively). Collapse state and mode are kept in localStorage so
// they survive navigation between the index and file pages (each is a
// full page load under VitePress's file-based routing).
//
// Deliberately position:fixed and rendered through Layout.vue's
// `layout-top` slot - that slot's DOM position doesn't matter for a fixed
// element, only that the component is mounted once per page.
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vitepress'
import summary from '../../../coverage-data/summary.json'
import { rate, rateClass, fileLink } from '../explorer-links.mjs'
import ExplorerDir from './ExplorerDir.vue'

const route = useRoute()

const COLLAPSED_KEY = 'coverage-explorer-collapsed'
const MODE_KEY = 'coverage-explorer-mode'

// Matches style.css's un-collapsed default so there's no layout flash
// before onMounted can read the real state from localStorage/viewport.
const collapsed = ref(false)
const mode = ref('files')

onMounted(() => {
  const storedCollapsed = window.localStorage.getItem(COLLAPSED_KEY)
  collapsed.value = storedCollapsed != null ? storedCollapsed === '1' : window.innerWidth < 960

  const storedMode = window.localStorage.getItem(MODE_KEY)
  if (storedMode === 'files' || storedMode === 'outline') mode.value = storedMode
})

// VitePress prerenders on the server, where window/document don't exist;
// these watchers only need to run client-side, after mount.
watch(collapsed, v => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(COLLAPSED_KEY, v ? '1' : '0')
  document.documentElement.classList.toggle('explorer-collapsed', v)
})

watch(mode, v => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(MODE_KEY, v)
})

// --- Files tree -----------------------------------------------------

const fileTotals = computed(() => {
  const byFile = new Map()
  for (const ns of summary.namespaces) {
    for (const t of ns.types) {
      if (!byFile.has(t.file)) byFile.set(t.file, { file: t.file, linesCovered: 0, linesValid: 0 })
      const f = byFile.get(t.file)
      f.linesCovered += t.linesCovered
      f.linesValid += t.linesValid
    }
  }
  return [...byFile.values()]
})

function buildFileTree(files) {
  const root = { dirs: new Map(), files: [] }
  for (const f of files) {
    const parts = f.file.split('/')
    let node = root
    let path = ''
    for (let i = 0; i < parts.length - 1; i++) {
      path = path ? `${path}/${parts[i]}` : parts[i]
      if (!node.dirs.has(parts[i])) node.dirs.set(parts[i], { name: parts[i], path, dirs: new Map(), files: [] })
      node = node.dirs.get(parts[i])
    }
    node.files.push({ name: parts[parts.length - 1], ...f })
  }
  return root
}

function sortTree(node) {
  const dirs = [...node.dirs.values()].sort((a, b) => a.name.localeCompare(b.name)).map(sortTree)
  const files = [...node.files].sort((a, b) => a.name.localeCompare(b.name))
  return { dirs, files }
}

const fileTree = computed(() => sortTree(buildFileTree(fileTotals.value)))

// --- Outline tree -----------------------------------------------------

const outline = computed(() =>
  [...summary.namespaces]
    .map(ns => ({
      name: ns.name,
      types: [...ns.types]
        .map(t => ({
          name: t.name || '(global functions)',
          file: t.file,
          startLine: t.startLine,
          rate: rate(t.linesCovered, t.linesValid),
          methods: [...t.methods]
            .map(m => ({ ...m, rate: rate(m.linesCovered, m.linesValid) }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
)

function isActiveLine(file, line) {
  return route.path === fileLink(file) && route.hash === '#L' + line
}
</script>

<template>
  <aside class="file-explorer" :class="{ collapsed }">
    <button class="collapse-toggle" @click="collapsed = !collapsed" :title="collapsed ? 'Expand browser' : 'Collapse browser'">
      {{ collapsed ? '»' : '«' }}
    </button>

    <div v-if="!collapsed" class="explorer-body">
      <div class="mode-tabs">
        <button :class="{ active: mode === 'files' }" @click="mode = 'files'">Files</button>
        <button :class="{ active: mode === 'outline' }" @click="mode = 'outline'">Outline</button>
      </div>

      <div class="tree-scroll">
        <ExplorerDir v-if="mode === 'files'" :dir="fileTree" />

        <template v-else>
          <details v-for="ns in outline" :key="ns.name" class="tree-node" open>
            <summary class="tree-label">{{ ns.name }}</summary>
            <div class="tree-children">
              <details v-for="t in ns.types" :key="t.name" class="tree-node">
                <summary class="tree-label">
                  <a class="tree-link" :class="{ active: isActiveLine(t.file, t.startLine) }" :href="fileLink(t.file, t.startLine)">{{ t.name }}</a>
                  <span class="rate-dot" :class="rateClass(t.rate)"></span>
                </summary>
                <div class="tree-children">
                  <div v-for="m in t.methods" :key="m.name + m.startLine" class="tree-leaf">
                    <a class="tree-link" :class="{ active: isActiveLine(m.file, m.startLine) }" :href="fileLink(m.file, m.startLine)">{{ m.name }}</a>
                    <span class="rate-dot" :class="rateClass(m.rate)"></span>
                  </div>
                </div>
              </details>
            </div>
          </details>
        </template>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.file-explorer {
  position: fixed;
  top: var(--vp-nav-height);
  left: 0;
  bottom: 0;
  width: 280px;
  border-right: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  z-index: 10;
}

.file-explorer.collapsed {
  width: 28px;
}

.collapse-toggle {
  position: absolute;
  top: 8px;
  right: -14px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-2);
  cursor: pointer;
  z-index: 11;
}

.file-explorer.collapsed .collapse-toggle {
  right: auto;
  left: 0;
}

.explorer-body {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.mode-tabs {
  display: flex;
  gap: 4px;
  padding: 12px 12px 8px;
  flex: none;
}

.mode-tabs button {
  flex: 1;
  padding: 4px 0;
  font-size: 12px;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
}

.mode-tabs button.active {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

.tree-scroll {
  overflow-y: auto;
  flex: 1;
  padding: 4px 8px 24px;
  font-size: 13px;
}
</style>
