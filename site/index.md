---
title: ghūl source
layout: page
---

<script setup>
import { onMounted } from 'vue'
import summary from './coverage-data/summary.json'
import CoverageIndex from './.vitepress/theme/components/CoverageIndex.vue'
import BrowseHome from './.vitepress/theme/components/BrowseHome.vue'
import { coverageMode, initCoverageMode } from './.vitepress/theme/coverage-mode.mjs'

onMounted(initCoverageMode)
</script>

<CoverageIndex v-if="coverageMode" :summary="summary" />
<BrowseHome v-else :summary="summary" />
