import { readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

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
  paths() {
    const found = []
    walk(dataDir, found)

    return found.map(jsonPath => {
      const data = JSON.parse(readFileSync(jsonPath, 'utf-8'))
      const slug = data.path.replace(/\//g, '__').replace(/\.ghul$/, '')

      return {
        params: {
          slug,
          path: data.path,
          linesJson: JSON.stringify(data.lines),
        },
      }
    })
  },
}
