import { readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { tokenizeLines, tokenizeSignature } from '../.vitepress/highlight.mjs'

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

// A hover's description/kindLabel repeats constantly across a file (common
// types, repeated locals) - dedup per file into a small table, and carry
// just an index on each covered segment, rather than embedding the full
// {description, kindLabel, signatureLines} object at every occurrence
// (which OOM'd the build across 489 pages worth of near-identical data).
async function buildHoverTable(hovers) {
  const table = []
  const indexByKey = new Map()

  const withIndex = await Promise.all((hovers ?? []).map(async h => {
    const key = `${h.kindLabel ?? ''}|||${h.description ?? ''}`
    let hoverIndex = indexByKey.get(key)

    if (hoverIndex === undefined) {
      hoverIndex = table.length
      indexByKey.set(key, hoverIndex)
      table.push({
        kindLabel: h.kindLabel ?? '',
        signatureLines: await tokenizeSignature(h.description ?? ''),
      })
    }

    return {
      startLine: h.startLine,
      startColumn: h.startColumn,
      endLine: h.endLine,
      endColumn: h.endColumn,
      hoverIndex,
    }
  }))

  return { table, spans: withIndex }
}

export default {
  async paths() {
    const found = []
    walk(dataDir, found)

    return Promise.all(found.map(async jsonPath => {
      const data = JSON.parse(readFileSync(jsonPath, 'utf-8'))
      const code = data.lines.map(l => l.text).join('\n')

      const { table: hoverTable, spans: hoverSpans } = await buildHoverTable(data.hovers)
      const colourLines = await tokenizeLines(code, data.semanticTokens, hoverSpans)

      const enrichedLines = data.lines.map((line, i) => ({
        ...line,
        segments: colourLines[i] ?? [{ text: line.text, style: null, semanticType: null, semanticStatic: false, hoverIndex: null }],
      }))

      const slug = data.path.replace(/\//g, '__').replace(/\.ghul$/, '')

      return {
        params: {
          slug,
          path: data.path,
          linesJson: JSON.stringify(enrichedLines),
          hoversJson: JSON.stringify(hoverTable),
        },
      }
    }))
  },
}
