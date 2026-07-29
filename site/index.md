---
title: Coverage report
layout: page
---

<script setup>
import summary from './coverage-data/summary.json'
import CoverageIndex from './.vitepress/theme/components/CoverageIndex.vue'
</script>

<CoverageIndex :summary="summary" />
