# ghūl coverage report

A coverage report generator for ghūl projects: reads one or more Cobertura
XML reports (as produced by `coverlet`), and renders a static HTML report —
headline line/branch coverage, a sortable/groupable per-type and per-method
breakdown, and drill-down source pages with ghūl-aware syntax highlighting
and per-line coverage annotation.

Intended as a drop-in replacement for the report-generation half of
[ReportGenerator](https://reportgenerator.io). Deployed to GitHub Pages at
<https://degory.github.io/ghul-coverage-report/>.

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
- `.github/workflows/coverage.yml` — the scheduled job (Mon/Thu 03:00 UTC,
  plus manual dispatch) that runs the whole pipeline end to end: checks out
  [degory/ghul](https://github.com/degory/ghul), runs its
  `build/coverage.sh` to capture Cobertura reports across the unit,
  integration, cross-assembly and analysis suites, runs
  `coverage-data-tool` against them, builds `site/`, and deploys the
  result. Coverage capture lives in `degory/ghul` (it needs that repo's
  own source and tests); turning the captured data into a report — and
  hosting it — is this repo's job, hence the cross-repo checkout runs
  here rather than the other way around.

Design notes and the phased implementation plan live in the ghūl workspace's
`docs/claude/coverage-report-generator.md` (not part of this repo — that
file is Claude-session scratch context for the workspace this was built in,
not project documentation).

## Status

Working end to end: headline coverage, sortable/groupable views, syntax
highlighting, hover tooltips, and the scheduled GitHub Pages deployment are
all in place. See `AGENTS.md` for the current architecture.
