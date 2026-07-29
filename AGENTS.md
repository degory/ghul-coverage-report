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
