---
title: "{{ $params.path }}"
---

<script setup>
import { useData } from 'vitepress'
import CoverageFile from '../.vitepress/theme/components/CoverageFile.vue'

const { params } = useData()
const lines = JSON.parse(params.value.linesJson)
</script>

<CoverageFile :path="params.path" :lines="lines" />
