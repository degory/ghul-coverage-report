---
title: "{{ $params.path }}"
---

<script setup>
import { useData } from 'vitepress'
import CoverageFile from '../.vitepress/theme/components/CoverageFile.vue'

const { params } = useData()
const lines = JSON.parse(params.value.linesJson)
const hovers = JSON.parse(params.value.hoversJson)
</script>

<CoverageFile :path="params.path" :lines="lines" :hovers="hovers" />
