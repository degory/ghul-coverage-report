<script setup>
// Wraps the default theme layout purely to inject FileExplorer.vue once
// per page, on every page (index and every file drill-down) - `layout-top`
// is a plain pass-through slot in DefaultTheme's own Layout.vue, and
// FileExplorer.vue is position:fixed, so its slot placement doesn't affect
// visual position, only that it mounts once.
import DefaultTheme from 'vitepress/theme'
import FileExplorer from './components/FileExplorer.vue'

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #layout-top>
      <FileExplorer />
    </template>
  </Layout>
</template>
