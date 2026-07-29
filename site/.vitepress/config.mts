import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'ghūl coverage report',
  description: 'Coverage report for a ghūl project',
  cleanUrls: true,

  // Deployed as a GitHub Pages *project* site (degory.github.io/<repo>/,
  // not a user/org root page or a custom domain), so every asset and
  // route needs this prefix - VitePress doesn't infer it from where the
  // site ends up being served.
  base: '/ghul-coverage-report/',

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
