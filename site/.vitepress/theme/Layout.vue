<script setup>
// Wraps the default theme layout for two reasons: to inject
// FileExplorer.vue once per page, on every page (index and every file
// drill-down) - `layout-top` is a plain pass-through slot in DefaultTheme's
// own Layout.vue, and FileExplorer.vue is position:fixed, so its slot
// placement doesn't affect visual position, only that it mounts once - and
// to show a navigation indicator.
//
// The indicator matters because the largest source files carry several
// thousand lines of pre-tokenized data, and fetching plus rendering one
// runs to seconds. Without feedback the page simply sits on the previous
// file for that whole time, which reads as a click that didn't register
// rather than as work in progress.
//
// It's delayed rather than immediate: most navigations here land in well
// under the threshold, and a spinner that appears and vanishes inside
// 150ms is a flash of noise on every single click. Only the ones slow
// enough to look broken get one.
import { ref, onUnmounted } from 'vue'
import DefaultTheme from 'vitepress/theme'
import { useRouter } from 'vitepress'
import FileExplorer from './components/FileExplorer.vue'

const { Layout } = DefaultTheme

const navigating = ref(false)
let timer = null

function clearTimer() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

const router = useRouter()

router.onBeforeRouteChange = () => {
  clearTimer()
  timer = setTimeout(() => { navigating.value = true }, 150)
}

router.onAfterRouteChanged = () => {
  clearTimer()
  navigating.value = false
}

onUnmounted(clearTimer)
</script>

<template>
  <Layout>
    <template #layout-top>
      <FileExplorer />
      <Transition name="fade">
        <div v-if="navigating" class="nav-indicator" role="status" aria-live="polite">
          <span class="spinner" aria-hidden="true"></span>
          Loading&hellip;
        </div>
      </Transition>
    </template>
  </Layout>
</template>

<style scoped>
/* Pinned to the top-right rather than centred: centred put it straight on
   top of the page heading and first paragraph, and this never collides
   with content whatever page is loading. */
.nav-indicator {
  position: fixed;
  top: calc(var(--vp-nav-height) + 16px);
  right: 24px;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  background: var(--vp-c-bg-elv);
  box-shadow: var(--vp-shadow-3);
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.spinner {
  width: 13px;
  height: 13px;
  border: 2px solid var(--vp-c-divider);
  border-top-color: var(--vp-c-brand-1);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* Respect a reduced-motion preference: the indicator still appears and
   still says what it's doing, it just stops spinning. */
@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
  }
}
</style>
