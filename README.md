# Coverage history

Data only — this branch carries no code and no site, and nothing is ever built
from it. It is where each run of the [Coverage
workflow](https://github.com/degory/ghul-coverage-report/blob/main/.github/workflows/coverage.yml)
records what it measured, so that a later run can say what moved.

```
totals.jsonl                       one line per run, oldest first
runs/<timestamp>-<run id>.jsonl    that run's per-file and per-type line counts
```

## totals.jsonl

One JSON object per line:

| field | |
| --- | --- |
| `timestamp` | when the run started, UTC |
| `runId`, `runAttempt`, `event` | the Actions run, and what triggered it |
| `ghulCommit` | the commit of `degory/ghul` that was measured |
| `reportCommit` | the commit of this repo that measured it |
| `linesCovered`, `linesValid`, `branchesCovered`, `branchesValid` | the headline numbers |
| `snapshot` | path to this run's per-site rows, or `null` once pruned |
| `source` | `run` if the run recorded itself, `recovered` if it was reconstructed afterwards |
| `note` | see below; `null` on almost every run |

Kept indefinitely: a line is a couple of hundred bytes, and it is what the
report site's trend chart plots.

## runs/

One JSON object per line, sorted by key:

```json
{"key":"src/semantic/symbol_table.ghul","linesCovered":573,"linesValid":578}
{"key":"src/semantic/symbol_table.ghul::SYMBOL_TABLE","linesCovered":573,"linesValid":578}
```

A key with `::` names a type, one without names a whole file, and `-` stands in
for a namespace's loose global functions. Line numbers are deliberately not part
of a key: they drift with every edit, and a history whose keys stop matching the
report is worse than no history.

Methods are not recorded. That would roughly quintuple the volume to answer a
question the type rows already answer.

Snapshots are pruned to the most recent hundred runs. The `totals.jsonl` line
for a pruned run stays, with `snapshot` set to `null`.

## When the numbers stop being comparable

Coverage can only be compared between runs that agree on what a coverable line
is. When that changes — as it did on 9 August 2026, when comments stopped being
counted — the step in the series is a change in counting, not in testing.

Say so by hand, on the line for the **first** run measured the new way:

```
"note": "Comments are no longer counted as coverable lines. ..."
```

The chart then marks that run and prints the note under it, and a comparison
across the boundary says the movement is the counting rather than attributing
it to the code.

## Editing this branch

Runs append to it automatically, so an edit races with whatever is scheduled.
Adding a `note`, or correcting one, is the only routine reason to edit by hand;
pull immediately before pushing.
