---
title: ghūl source
layout: page
---

<script setup>
import { onMounted } from 'vue'
import summary from './coverage-data/summary.json'
import history from './coverage-data/history.json'
import CoverageIndex from './.vitepress/theme/components/CoverageIndex.vue'
import CoverageTrend from './.vitepress/theme/components/CoverageTrend.vue'
import BrowseHome from './.vitepress/theme/components/BrowseHome.vue'
import { coverageMode, initCoverageMode } from './.vitepress/theme/coverage-mode.mjs'

onMounted(initCoverageMode)
</script>

<CoverageTrend v-if="coverageMode" :history="history" />
<CoverageIndex v-if="coverageMode" :summary="summary" />
<BrowseHome v-else :summary="summary" />
