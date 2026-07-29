import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'ghūl coverage report',
  description: 'Coverage report for a ghūl project',
  cleanUrls: true,

  themeConfig: {
    nav: [{ text: 'Report', link: '/' }],
  },
})
