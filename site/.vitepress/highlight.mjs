// Ghūl syntax highlighting for the report's drill-down pages: Shiki
// tokenizes with the vendored TextMate grammar (base colour for keywords,
// strings, comments, numbers, ...), then a semantic token (from the
// compiler's own analyser, via coverage-data-tool's per-file JSON)
// overrides the colour for any identifier span it covers - so an
// identifier reliably reflects what the compiler resolved it to, not a
// regex-based guess. A hover span (also from the analyser) rides along on
// each segment for the tooltip; segments carry the innermost hover if
// several overlap.
//
// Ported from ghul-dev's src/.vitepress/config.mts (ghulExampleDataPlugin)
// and src/.vitepress/theme/components/GhulExample.vue (mergeLine /
// pickSpans), trimmed to colour + semantic-token + hover overlay - this
// report has no diagnostic/inlay spans (no live compile happens against
// the report, so there's nothing to flag). ghul.tmLanguage.json is
// vendored from the same source, itself vendored there from
// ghul-vsce/syntaxes/. If ghul-dev's grammar or theme changes, port the
// change here too.
import { createHighlighter } from 'shiki'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const grammar = JSON.parse(
  readFileSync(fileURLToPath(new URL('./ghul.tmLanguage.json', import.meta.url)), 'utf-8'),
)

// A whole file draws on a handful of distinct colours, but Shiki hands
// back the full {--shiki-light, --shiki-dark} pair on every token - and
// each page's data is baked into its own JS module as an escaped JSON
// string, so every repeat costs twice over in escaping. Interning them
// into a per-page table and carrying a small integer on each segment is
// the same trick buildHoverTable already applies to hover descriptions in
// files/[slug].paths.js, for the same reason.
export function createStylePalette() {
  const indexByKey = new Map()
  const list = []

  return {
    idFor(style) {
      if (!style) return null

      const key = JSON.stringify(style)
      if (!indexByKey.has(key)) {
        indexByKey.set(key, list.length)
        list.push(style)
      }
      return indexByKey.get(key)
    },
    list,
  }
}

let highlighterPromise = null

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['light-plus', 'dark-plus'],
      langs: [grammar],
    })
  }
  return highlighterPromise
}

// Returns one array of segments per line of `code`, aligned 1:1 with
// `code.split('\n')`. Segment keys are terse and absent-when-empty because
// they repeat once per token across the whole file - see the segment shape
// documented on mergeLine.
export async function tokenizeLines(code, semanticTokens, hovers, palette) {
  const highlighter = await getHighlighter()

  const { tokens } = highlighter.codeToTokens(code, {
    lang: 'ghul',
    themes: { light: 'light-plus', dark: 'dark-plus' },
    defaultColor: false,
  })

  return tokens.map((lineTokens, i) => mergeLine(lineTokens, i + 1, semanticTokens ?? [], hovers ?? [], palette))
}

// A hover's `description` is itself ghūl and is rendered in the tooltip as
// a small syntax-coloured block, the same way the VSCE shows it. Many
// hovers across a whole project repeat the same description (common types,
// repeated locals) - cached by text so the whole-project run doesn't
// re-tokenise the same handful of strings hundreds of thousands of times.
const signatureCache = new Map()

// The cache holds raw {text, style} tokens rather than palette indices:
// it lives for the whole build while a palette is per-page, so the index
// is resolved per call and only the tokenizing is shared.
export async function tokenizeSignature(text, palette) {
  let raw = signatureCache.get(text)

  if (!raw) {
    const highlighter = await getHighlighter()

    const { tokens } = highlighter.codeToTokens(text, {
      lang: 'ghul',
      themes: { light: 'light-plus', dark: 'dark-plus' },
      defaultColor: false,
    })

    raw = tokens.map(lineTokens => lineTokens.map(t => ({ text: t.content, style: t.htmlStyle ?? null })))
    signatureCache.set(text, raw)
  }

  return raw.map(lineTokens => lineTokens.map(t => compact({ t: t.text, s: palette.idFor(t.style) })))
}

// JSON.stringify drops undefined-valued keys entirely, so absent fields
// cost nothing on the wire - where a spelled-out `"hoverIndex":null` on
// every token would cost more than the payload it describes.
//
// Only null and undefined are dropped, deliberately: a segment's `s` and
// `h` are indexes, and index 0 is a real one.
function compact(o) {
  for (const k of Object.keys(o)) {
    if (o[k] == null) delete o[k]
  }
  return o
}

// Segment shape, deliberately terse - one of these exists per contiguous
// run of same-styled characters, so on the order of thousands per file and
// millions across the report:
//   t  text (always present)
//   s  index into the style palette; absent when a semantic class supplies
//      the colour instead, or when the run is unstyled
//   c  semantic CSS class(es); absent when the analyser covered no part of
//      the run
//   h  index into the page's hover table; absent when nothing hovers here
function mergeLine(colourTokens, lineNumber, semantic, hovers, palette) {
  const chars = []
  const styles = []

  for (const token of colourTokens) {
    for (const ch of token.content) {
      chars.push(ch)
      styles.push(token.htmlStyle ?? {})
    }
  }

  const length = chars.length
  const semanticAt = pickSpans(semantic, lineNumber, length)
  const hoverAt = pickSpans(hovers, lineNumber, length)

  const items = []
  let column = 0

  while (column < length) {
    const style = styles[column]
    const sem = semanticAt[column]
    const hover = hoverAt[column]
    let end = column + 1

    while (end < length && styles[end] === style && semanticAt[end] === sem && hoverAt[end] === hover) {
      end++
    }

    items.push(compact({
      t: chars.slice(column, end).join(''),
      // A semantic token's CSS class supplies the colour; drop the Shiki
      // inline style on that range so the class isn't fighting it.
      s: sem ? null : palette.idFor(style),
      c: sem ? semanticClass(sem) : null,
      // Only the small integer index into the caller's deduplicated hover
      // table travels with the segment - embedding the full
      // {description, kindLabel, signatureLines} object at every one of a
      // hover's (often many) covered segments blew the build's heap across
      // 489 pages worth of near-identical entries (repeated types like
      // "int" occur constantly).
      h: hover ? hover.hoverIndex : null,
    }))

    column = end
  }

  return items.length > 0 ? items : [{ t: '' }]
}

// Precomputed at build time rather than assembled per segment in the
// template: the two inputs never change once tokenized, and the string is
// what the class binding wants anyway.
function semanticClass(sem) {
  const base = 'ghul-sem-' + sem.tokenType
  return (sem.modifiers ?? '').includes('static') ? base + ' ghul-sem-mod-static' : base
}

// For one line, the per-column innermost (shortest) span covering it.
// Spans are {startLine, startColumn, endLine, endColumn} (1-based,
// matching the wire shape the compiler's analyser reports).
function pickSpans(spans, lineNumber, length) {
  const at = new Array(length).fill(null)
  const width = new Array(length).fill(Infinity)

  for (const span of spans) {
    if (span.startLine > lineNumber || span.endLine < lineNumber) continue

    const from = span.startLine < lineNumber ? 1 : span.startColumn
    const to = span.endLine > lineNumber ? length : span.endColumn
    const size = (span.endLine - span.startLine) * 100000 + (span.endColumn - span.startColumn)

    for (let column = from; column <= to && column <= length; column++) {
      if (size < width[column - 1]) {
        width[column - 1] = size
        at[column - 1] = span
      }
    }
  }

  return at
}
