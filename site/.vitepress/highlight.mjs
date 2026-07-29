// Ghūl syntax highlighting for the report's drill-down pages: Shiki
// tokenizes with the vendored TextMate grammar (base colour for keywords,
// strings, comments, numbers, ...), then a semantic token (from the
// compiler's own analyser, via coverage-data-tool's per-file JSON)
// overrides the colour for any identifier span it covers - so an
// identifier reliably reflects what the compiler resolved it to, not a
// regex-based guess.
//
// Ported from ghul-dev's src/.vitepress/config.mts (ghulExampleDataPlugin)
// and src/.vitepress/theme/components/GhulExample.vue (mergeLine /
// pickSpans), trimmed to colour + semantic-token overlay only - this
// report has no hover/diagnostic/inlay spans yet (that's a later phase).
// ghul.tmLanguage.json is vendored from the same source, itself vendored
// there from ghul-vsce/syntaxes/. If ghul-dev's grammar or theme changes,
// port the change here too.
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

// Returns one array of {text, style, semanticType, semanticStatic} per
// line of `code`, aligned 1:1 with `code.split('\n')`.
export async function tokenizeLines(code, semanticTokens) {
  const highlighter = await getHighlighter()

  const { tokens } = highlighter.codeToTokens(code, {
    lang: 'ghul',
    themes: { light: 'light-plus', dark: 'dark-plus' },
    defaultColor: false,
  })

  return tokens.map((lineTokens, i) => mergeLine(lineTokens, i + 1, semanticTokens ?? []))
}

function mergeLine(colourTokens, lineNumber, semantic) {
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

  const items = []
  let column = 0

  while (column < length) {
    const style = styles[column]
    const sem = semanticAt[column]
    let end = column + 1

    while (end < length && styles[end] === style && semanticAt[end] === sem) {
      end++
    }

    items.push({
      text: chars.slice(column, end).join(''),
      // A semantic token's CSS class supplies the colour; drop the Shiki
      // inline style on that range so the class isn't fighting it.
      style: sem ? null : style,
      semanticType: sem ? sem.tokenType : null,
      semanticStatic: sem ? (sem.modifiers ?? '').includes('static') : false,
    })

    column = end
  }

  return items.length > 0 ? items : [{ text: '', style: null, semanticType: null, semanticStatic: false }]
}

// For one line, the per-column innermost (shortest) semantic-token span
// covering it. Spans are {startLine, startColumn, endLine, endColumn}
// (coverage-data-tool's TOKEN_DTO, 1-based - matches the wire shape the
// compiler's analyser reports).
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
