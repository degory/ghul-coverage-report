<script setup>
// Persistent left-hand browser, shown on every page via theme/Layout.vue.
// Two ways to reach the same source, because a codebase is navigated by
// two different mental models and neither subsumes the other: "Files" (a
// directory tree, from files.json - every source file report_writer wrote
// a page for, regardless of coverage; summary.json only knows about files
// that appear in at least one Cobertura report, which silently drops
// anything no suite's instrumentation touched - rendered recursively by
// ExplorerDir.vue) and "Outline" (namespace -> type -> method, from
// summary.json - only three levels deep, so rendered inline rather than
// recursively). ghūl namespaces do not have to line up with directories,
// so neither view can be derived from the other by eye.
//
// Both are navigation; the coverage rate bar on each row rides along
// rather than being a mode of its own. With a file page open, Outline puts
// that file's own types and methods first, so the member list answers
// "what is in this file" and "which parts of it are untested" together,
// and follows them with the whole-project tree - this pane is persistent,
// so showing only the open file would take the symbol axis away exactly
// while a file is being read.
//
// Collapse state and mode are kept in localStorage so they survive
// navigation between the index and file pages - and, within a single
// page-load, VitePress's router swaps only <Content/> on navigation
// (that's what makes it feel like an SPA); FileExplorer is mounted once
// via Layout.vue, outside <Content/>, so it survives an in-app navigation
// untouched rather than remounting.
//
// A type row's name is a real link (like a file or method leaf), but its
// click handler also forces its own <details> open - clicking a type both
// navigates to its file *and* reveals its methods, rather than requiring
// a second click. This is safe specifically because of the above: the
// click navigates via VitePress's client-side router, not a full page
// load, so the DOM node whose `.open` we just set doesn't get torn down
// by the navigation it's also triggering. A namespace or directory row
// has no navigable target, so its whole summary just toggles natively -
// no click handler needed there.
//
// `.tree-toggle` is a dedicated, generously-sized (20px) chevron on every
// expandable row, kept as a real element rather than a CSS-drawn marker -
// `display: flex` on `.tree-label` (needed for layout) suppresses a
// <summary>'s native marker in Chromium/Firefox, and a few px of
// replacement glyph is too small a target to hit on purpose. It's also
// the only way to expand a type row *without* navigating away from
// whatever file is currently open, since the name link always does both.
//
// Deliberately position:fixed and rendered through Layout.vue's
// `layout-top` slot - that slot's DOM position doesn't matter for a fixed
// element, only that the component is mounted once per page.
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vitepress'
import summary from '../../../coverage-data/summary.json'
import files from '../../../coverage-data/files.json'
import { rate, rateBar, rateTitle, fileLink } from '../explorer-links.mjs'
import ExplorerDir from './ExplorerDir.vue'

const route = useRoute()

const COLLAPSED_KEY = 'coverage-explorer-collapsed'
const MODE_KEY = 'coverage-explorer-mode'

// Kept in step with the same breakpoint in style.css. Matched with
// matchMedia rather than by reading window.innerWidth: on a narrow screen
// the browser widens the layout viewport to fit an over-wide document, so
// innerWidth reports the widened value and a width test against it decides
// there is plenty of room - the very situation the collapse exists to
// avoid. A media query is evaluated against the device width regardless.
const EXPLORER_OVERLAY_QUERY = '(max-width: 960px)'

// Matches style.css's un-collapsed default so there's no layout flash
// before onMounted can read the real state from localStorage/viewport.
const collapsed = ref(false)
const mode = ref('files')

onMounted(() => {
  const storedCollapsed = window.localStorage.getItem(COLLAPSED_KEY)
  collapsed.value = storedCollapsed != null
    ? storedCollapsed === '1'
    : window.matchMedia(EXPLORER_OVERLAY_QUERY).matches

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

function buildFileTree(entries) {
  const root = { dirs: new Map(), files: [] }
  for (const f of entries) {
    const parts = f.path.split('/')
    let node = root
    let path = ''
    for (let i = 0; i < parts.length - 1; i++) {
      path = path ? `${path}/${parts[i]}` : parts[i]
      if (!node.dirs.has(parts[i])) node.dirs.set(parts[i], { name: parts[i], path, dirs: new Map(), files: [] })
      node = node.dirs.get(parts[i])
    }
    node.files.push({ name: parts[parts.length - 1], file: f.path, linesCovered: f.linesCovered, linesValid: f.linesValid, measured: f.measured })
  }
  return root
}

// Recurses depth-first, keeping each directory's own name/path alongside
// its now-sorted children - a plain `.map(sortTree)` would replace each
// directory with sortTree's return value, which only has {dirs, files},
// silently dropping name/path from every level but the leaves.
function sortTree(node) {
  const dirs = [...node.dirs.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(d => ({ ...d, ...sortTree(d) }))
  const files = [...node.files].sort((a, b) => a.name.localeCompare(b.name))
  return { dirs, files }
}

const fileTree = computed(() => sortTree(buildFileTree(files)))

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
          linesCovered: t.linesCovered,
          linesValid: t.linesValid,
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

// --- File-scoped outline ----------------------------------------------

// Which file's page is open, if any. Derived by matching the route against
// each known file's own link rather than by un-slugifying the path: the
// slug flattening in files/[slug].paths.js maps `/` to `__` and leaves an
// existing `_` alone, so a path that already contains `__` is
// indistinguishable from a directory separator and the mapping cannot be
// reversed reliably.
const currentFile = computed(() => {
  const found = files.find(f => fileLink(f.path) === route.path)
  return found ? found.path : null
})

const fileOutline = computed(() => {
  if (!currentFile.value) return null

  const types = []
  for (const ns of summary.namespaces) {
    for (const t of ns.types) {
      if (t.file !== currentFile.value) continue
      types.push({
        name: t.name || '(global functions)',
        namespace: ns.name,
        file: t.file,
        startLine: t.startLine,
        rate: rate(t.linesCovered, t.linesValid),
        methods: [...t.methods]
          .map(m => ({ ...m, rate: rate(m.linesCovered, m.linesValid) }))
          .sort((a, b) => a.startLine - b.startLine),
      })
    }
  }

  // Source order, not alphabetical: this list is read against the file
  // beside it, so it should run the same way the file does.
  return types.sort((a, b) => a.startLine - b.startLine)
})
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

        <!-- The open file's members come first, in source order and flat -
             no nesting to expand past, and it reads alongside the code
             beside it. See the note at the top of this file for why the
             whole-project tree still follows below. -->
        <template v-else>
          <template v-if="fileOutline">
            <div class="outline-scope">{{ currentFile }}</div>
            <template v-if="fileOutline.length">
              <div v-for="t in fileOutline" :key="t.name + t.startLine" class="outline-type">
                <div class="tree-leaf">
                  <a class="tree-link type" :class="{ active: isActiveLine(t.file, t.startLine) }" :href="fileLink(t.file, t.startLine)">{{ t.name }}</a>
                  <span class="rate-bar" v-bind="rateBar(t.rate)" :title="rateTitle(t.linesCovered, t.linesValid)"></span>
                </div>
                <!-- Overloads share a name and are only told apart by their
                     signature, which runs to well over a hundred characters
                     and would wrap or truncate in a column this narrow - so
                     the row shows the name and the signature is on hover. -->
                <div v-for="m in t.methods" :key="m.name + m.startLine" class="tree-leaf indented">
                  <a
                    class="tree-link"
                    :class="{ active: isActiveLine(m.file, m.startLine) }"
                    :href="fileLink(m.file, m.startLine)"
                    :title="m.signature"
                  >{{ m.name }}</a>
                  <span class="rate-bar" v-bind="rateBar(m.rate)" :title="rateTitle(m.linesCovered, m.linesValid)"></span>
                </div>
              </div>
            </template>
            <div v-else class="outline-empty">No instrumented members in this file.</div>

            <div class="outline-heading">All namespaces</div>
          </template>

          <details v-for="ns in outline" :key="ns.name" class="tree-node">
            <summary class="tree-label">
              <span class="tree-toggle"></span>
              {{ ns.name }}
            </summary>
            <div class="tree-children">
              <details v-for="t in ns.types" :key="t.name" class="tree-node">
                <summary class="tree-label">
                  <span class="tree-toggle"></span>
                  <a
                    class="tree-link"
                    :class="{ active: isActiveLine(t.file, t.startLine) }"
                    :href="fileLink(t.file, t.startLine)"
                    @click="$event.currentTarget.closest('details').open = true"
                  >{{ t.name }}</a>
                  <span class="rate-bar" v-bind="rateBar(t.rate)" :title="rateTitle(t.linesCovered, t.linesValid)"></span>
                </summary>
                <div class="tree-children">
                  <div v-for="m in t.methods" :key="m.name + m.startLine" class="tree-leaf">
                    <a
                      class="tree-link"
                      :class="{ active: isActiveLine(m.file, m.startLine) }"
                      :href="fileLink(m.file, m.startLine)"
                      :title="m.signature"
                    >{{ m.name }}</a>
                    <span class="rate-bar" v-bind="rateBar(m.rate)" :title="rateTitle(m.linesCovered, m.linesValid)"></span>
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
  padding: 12px 12px 0;
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

.outline-scope {
  padding: 8px 4px 6px;
  margin-bottom: 4px;
  border-bottom: 1px solid var(--vp-c-divider);
  font-family: 'Fira Code', var(--vp-font-family-mono);
  font-size: 11px;
  color: var(--vp-c-text-3);
  word-break: break-all;
}

.outline-empty {
  padding: 8px 4px;
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.outline-heading {
  margin-top: 16px;
  padding: 8px 4px 6px;
  border-top: 1px solid var(--vp-c-divider);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--vp-c-text-3);
}

.outline-type + .outline-type {
  margin-top: 8px;
}

.tree-link.type {
  font-weight: 600;
}

.tree-leaf.indented {
  padding-left: 16px;
}

.tree-scroll {
  overflow-y: auto;
  flex: 1;
  padding: 4px 8px 24px;
  font-size: 13px;
}
</style>
