import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'ghūl coverage report',
  description: 'Coverage report for a ghūl project',
  cleanUrls: true,

  themeConfig: {
    nav: [{ text: 'Report', link: '/' }],
  },

  // files/[slug].md's frontmatter `title: "{{ $params.path }}"` only
  // interpolates in rendered markdown *content* - the <title> tag itself
  // (and the browser tab) took the mustache expression literally. Setting
  // pageData.title here, from the same per-page params, is what actually
  // drives <title> generation for a dynamic route.
  transformPageData(pageData) {
    if (pageData.params?.path) {
      pageData.title = pageData.params.path
    }
  },
})
