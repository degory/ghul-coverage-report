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

// Returns one array of {text, style, semanticType, semanticStatic, hover}
// per line of `code`, aligned 1:1 with `code.split('\n')`. `hover`, when
// present, already carries its tokenised `signatureLines` (see
// tokenizeSignature below) - ready for the tooltip to render directly.
export async function tokenizeLines(code, semanticTokens, hovers) {
  const highlighter = await getHighlighter()

  const { tokens } = highlighter.codeToTokens(code, {
    lang: 'ghul',
    themes: { light: 'light-plus', dark: 'dark-plus' },
    defaultColor: false,
  })

  return tokens.map((lineTokens, i) => mergeLine(lineTokens, i + 1, semanticTokens ?? [], hovers ?? []))
}

// A hover's `description` is itself ghūl and is rendered in the tooltip as
// a small syntax-coloured block, the same way the VSCE shows it. Many
// hovers across a whole project repeat the same description (common types,
// repeated locals) - cached by text so the whole-project run doesn't
// re-tokenise the same handful of strings hundreds of thousands of times.
const signatureCache = new Map()

export async function tokenizeSignature(text) {
  if (signatureCache.has(text)) {
    return signatureCache.get(text)
  }

  const highlighter = await getHighlighter()

  const { tokens } = highlighter.codeToTokens(text, {
    lang: 'ghul',
    themes: { light: 'light-plus', dark: 'dark-plus' },
    defaultColor: false,
  })

  const result = tokens.map(lineTokens => lineTokens.map(t => ({ text: t.content, style: t.htmlStyle ?? {} })))
  signatureCache.set(text, result)
  return result
}

function mergeLine(colourTokens, lineNumber, semantic, hovers) {
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

    items.push({
      text: chars.slice(column, end).join(''),
      // A semantic token's CSS class supplies the colour; drop the Shiki
      // inline style on that range so the class isn't fighting it.
      style: sem ? null : style,
      semanticType: sem ? sem.tokenType : null,
      semanticStatic: sem ? (sem.modifiers ?? '').includes('static') : false,
      // Only the small integer index into the caller's deduplicated hover
      // table travels with the segment - embedding the full
      // {description, kindLabel, signatureLines} object at every one of a
      // hover's (often many) covered segments blew the build's heap across
      // 489 pages worth of near-identical entries (repeated types like
      // "int" occur constantly).
      hoverIndex: hover ? hover.hoverIndex : null,
    })

    column = end
  }

  return items.length > 0 ? items : [{ text: '', style: null, semanticType: null, semanticStatic: false, hoverIndex: null }]
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
