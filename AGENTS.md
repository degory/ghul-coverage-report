# AI Agent Guide for ghūl coverage report

## What this is

A coverage report generator for ghūl projects — reads Cobertura XML
(coverlet's output), renders a static HTML report with ghūl-aware syntax
highlighting and per-line coverage annotation. Two halves:

- `coverage-data-tool/` — a ghūl console app (data producer). Parses/merges
  Cobertura XML, drives `dotnet ghul-compiler --analyse` (the same
  analysis-mode protocol VS Code and `ghul-mcp` use) to resolve each source
  file's namespace/type/method structure (`SYMBOLS`) and, when enabled,
  highlighting/hover data (`SEMANTIC_TOKENS`, `HOVER_MAP`). Writes a
  directory of JSON files.
- `site/` — a VitePress project (renderer), forked from `ghul-dev`'s
  example-rendering pipeline. Consumes the data tool's JSON at build time —
  the vendored `ghul.tmLanguage.json` grammar + Shiki tokenize the raw
  source, a component ported from `ghul-dev`'s `GhulExample.vue` merges
  colour/semantic-token/hover/coverage spans per line, `vitepress build`
  prerenders everything to static HTML.

Neither half commits its generated data or the rendered report to git — see
"Generated data" below.

## Why two runtimes

The highlighting technology (a TextMate grammar interpreted by Shiki) is a
Node-ecosystem tool with no ghūl or .NET equivalent, and `ghul-dev` already
has a maintained instance of exactly this pipeline — reusing it beats
rebuilding a worse version of the same thing compiler-side (a raw lexical
token stream doesn't carry the TextMate grammar's category vocabulary). The
ghūl-authored half is the part that's genuinely ghūl/compiler domain logic:
Cobertura parsing, driving the analyser, and coverage rollups.

## Build and run

```sh
cd coverage-data-tool
dotnet tool restore
dotnet build
dotnet run -- -reports:../sample-data/*.cobertura.xml -project:/path/to/ghul -targetdir:../site/coverage-data

cd ../site
npm install
npm run dev     # or: npm run build && npm run preview
```

## CI

`.github/workflows/coverage.yml` runs the whole pipeline on a schedule
(Mon/Thu 03:00 UTC) plus manual dispatch: checks out `degory/ghul` alongside
this repo, runs `ghul/build/coverage.sh` to capture Cobertura reports, then
`coverage-data-tool` and `site/` exactly as in local dev above but with
absolute (`${{ github.workspace }}`-rooted) paths across the two checkouts.
Deploys to this repo's own GitHub Pages, not `degory/ghul`'s — see the
README for why the checkout direction is this way round.

## Coverage history

`coverage-data-tool/src/history/` records each run on the `coverage-history`
branch and compares it with the previous one. Four pieces:

- `snapshot_builder.ghul` — flattens the coverage tree to one row per type and
  one per file. File rows are summed from the type rows, so a file nothing
  instrumented gets no row rather than a 0/0 one. Methods are deliberately not
  recorded.
- `history_store.ghul` — reads and writes the branch. Both files are
  line-oriented and appended to rather than rewritten, because the directory is
  a git branch and a rewrite costs a whole new blob every run.
- `regression_report.ghul` — the markdown that lands in the job summary.
  Compares line *rate*, not covered lines: code moves between runs, and a type
  that lost ten covered lines because ten lines were deleted has not regressed.
- `run_identity.ghul` — provenance, from the standard `GITHUB_*` environment
  where it exists and self-describing as local where it doesn't.

The site reads none of that. It gets `history.json`, a compact series written
into the report data directory alongside `summary.json`, and rendered by
`CoverageTrend.vue`. A run without `-historydir:` still writes an empty
`history.json`, because the site imports it unconditionally.

Two things to know before changing any of it. The tool is given the history
directory but never creates the branch, so a fresh clone of the workflow needs
that branch to exist. And a run on a ref other than `main` records itself
locally and never pushes — that is what makes an ad-hoc dispatch safe to use
for trying the pipeline out.

## Generated data

`site/coverage-data/` (or wherever `-targetdir` points) is git-ignored.
Coverage report data is machine-generated output that changes on every CI
run and is never hand-reviewed as source — unlike `ghul-dev`'s committed
`example-data/*.json` (content, curated at authoring time, decoupling CI
from needing a compiler). None of that reasoning applies here: the CI job
that will produce this data already has the compiler and Cobertura output on
hand every run, so there's no benefit to committing it, only git-history
bloat. Generate fresh, build, deploy only the final static site.

## Conventions

Follows the same conventions as the rest of the ghūl ecosystem repos
(`ghul`, `ghul-mcp`, `ghul-dev`): `snake_case` members, `UPPER_SNAKE_CASE`
concrete classes, `PascalCase` namespaces/traits, MIT license,
`Co-Authored-By` trailer on commits, squash-merged PRs.

Files ported from `ghul-dev` (the grammar, the Shiki plugin, the Vue
components' merge/tooltip logic, the `.ghul-sem-*` CSS palette) carry a short
comment noting their origin, so a future `ghul-dev` update to the grammar or
theme is known to want porting over here too.
