# ghūl coverage report

A coverage report generator for ghūl projects: reads one or more Cobertura
XML reports (as produced by `coverlet`), and renders a static HTML report —
headline line/branch coverage, a sortable/groupable per-type and per-method
breakdown, and drill-down source pages with ghūl-aware syntax highlighting
and per-line coverage annotation.

Intended as a drop-in replacement for the report-generation half of
[ReportGenerator](https://reportgenerator.io) in ghūl's own coverage
pipeline (`ghul/build/coverage.sh`), deployed to GitHub Pages.

## Layout

- `coverage-data-tool/` — a ghūl console app. Parses and merges Cobertura
  XML, drives the compiler's analysis-mode protocol (`SYMBOLS`,
  `SEMANTIC_TOKENS`, `HOVER_MAP`) over the project's source, and writes a
  directory of JSON data files consumed by `site/`.
- `site/` — a VitePress site (forked from
  [ghul-dev](https://github.com/degory/ghul-dev)'s example-rendering
  pipeline: the same vendored TextMate grammar, Shiki-based highlighting
  build step, and `GhulExample.vue`-derived rendering) that turns
  `coverage-data-tool`'s JSON output into the static report.

Design notes and the phased implementation plan live in the ghūl workspace's
`docs/claude/coverage-report-generator.md` (not part of this repo — that
file is Claude-session scratch context for the workspace this was built in,
not project documentation).

## Status

Early — Phase 1 (headline + sortable table, no highlighting yet) in
progress. See `AGENTS.md` for the current architecture.
