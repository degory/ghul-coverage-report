import { readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { tokenizeLines } from '../.vitepress/highlight.mjs'

// coverage-data-tool writes one JSON file per source file under
// site/coverage-data/files/, mirroring the project's own directory
// structure. Flatten that into a single [slug] route segment per file
// (VitePress dynamic routes don't support nested catch-all segments) -
// CoverageIndex.vue's slugFor() must stay in sync with this.
const dataDir = fileURLToPath(new URL('../coverage-data/files', import.meta.url))

function walk(dir, out) {
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }

  for (const name of entries) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      walk(path, out)
    } else if (name.endsWith('.json')) {
      out.push(path)
    }
  }
}

export default {
  async paths() {
    const found = []
    walk(dataDir, found)

    return Promise.all(found.map(async jsonPath => {
      const data = JSON.parse(readFileSync(jsonPath, 'utf-8'))
      const code = data.lines.map(l => l.text).join('\n')
      const colourLines = await tokenizeLines(code, data.semanticTokens)

      const enrichedLines = data.lines.map((line, i) => ({
        ...line,
        segments: colourLines[i] ?? [{ text: line.text, style: null, semanticType: null, semanticStatic: false }],
      }))

      const slug = data.path.replace(/\//g, '__').replace(/\.ghul$/, '')

      return {
        params: {
          slug,
          path: data.path,
          linesJson: JSON.stringify(enrichedLines),
        },
      }
    }))
  },
}
