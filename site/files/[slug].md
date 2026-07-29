---
layout: page
---

<script setup>
import { useData } from 'vitepress'
import CoverageFile from '../.vitepress/theme/components/CoverageFile.vue'

const { params } = useData()
const lines = JSON.parse(params.value.linesJson)
const hovers = JSON.parse(params.value.hoversJson)
const styles = JSON.parse(params.value.stylesJson)
</script>

<CoverageFile :path="params.path" :lines="lines" :hovers="hovers" :styles="styles" />
