# ghūl coverage report

A coverage report generator for ghūl projects: reads one or more Cobertura
XML reports (as produced by `coverlet`), and renders a static HTML report —
headline line/branch coverage, a sortable/groupable per-type and per-method
breakdown, and drill-down source pages with ghūl-aware syntax highlighting
and per-line coverage annotation.

Intended as a drop-in replacement for the report-generation half of
[ReportGenerator](https://reportgenerator.io). Deployed to GitHub Pages at
<https://degory.github.io/ghul-coverage-report/>.

The numbers behind the report are published alongside it, for anything that
wants to read them rather than look at them:

| URL | What it holds |
| --- | --- |
| [`/badge.json`](https://degory.github.io/ghul-coverage-report/badge.json) | headline line coverage, as a shields.io endpoint |
| [`/data/summary.json`](https://degory.github.io/ghul-coverage-report/data/summary.json) | every namespace, type and method, with its line and branch counts |
| [`/data/files.json`](https://degory.github.io/ghul-coverage-report/data/files.json) | per-file line counts |
| [`/data/history.json`](https://degory.github.io/ghul-coverage-report/data/history.json) | every recorded run's headline numbers, oldest first |

The first three carry the most recent run only. Each run also uploads them as
its `coverage-data` artifact, which is retained for 90 days.

## Coverage history

Every run appends itself to the [`coverage-history`](https://github.com/degory/ghul-coverage-report/tree/coverage-history)
branch, which is data only — no code, no site. That branch is the answer to
"has coverage moved, and what moved it":

```
totals.jsonl                       one line per run: when, what commit, the headline numbers
runs/<timestamp>-<run id>.jsonl    that run's line counts per file and per type
README.md
```

A branch rather than the run artifacts, because artifacts expire after 90 days
and the report site wants the whole series in one fetch rather than an API
round trip per past run. Snapshots are pruned to the most recent hundred runs;
the headline numbers in `totals.jsonl` are kept indefinitely, being a couple of
hundred bytes each.

Each run compares itself against the one before it and writes the difference
into its job summary — the headline movement, then the types and files that
lost coverage. Runs are not assumed to be regular: the schedule is twice
weekly, ad-hoc dispatches are normal, and the series is ordered and plotted by
when a run happened rather than by how many runs preceded it.

Coverage is only comparable between runs that count coverable lines the same
way. When that changes, add a `note` to the affected run's line in
`totals.jsonl` by hand; the chart marks the run and the comparison says so
instead of blaming the code.

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
  `coverage-data-tool` against them, records the run in the
  `coverage-history` branch, builds `site/`, and deploys the
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
