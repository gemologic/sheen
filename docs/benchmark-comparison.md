# Paired hosted AdminApp comparison

The manual **Compare AdminApp performance** workflow compares two application commits on each of five fresh Ubuntu 24.04 runners. Each job builds both applications before measuring, runs them sequentially, and alternates base-first/candidate-first across jobs (three versus two). Each application measurement retains the normal five fresh-browser-context samples. Jobs do not cancel their peers on failure.

## Run

Commit and push the workflow and helper to the default branch first. GitHub requires a `workflow_dispatch` workflow to exist there before it can be dispatched. Then use Actions → Compare AdminApp performance → Run workflow, or:

```sh
gh workflow run benchmark-compare.yml --repo gemologic/sheen \
  -f base=d86a879170afa2a24bf11552b4a0ef50577532f3 \
  -f candidate=main
gh run list --repo gemologic/sheen --workflow benchmark-compare.yml --limit 5
gh run watch RUN_ID --repo gemologic/sheen
gh run download RUN_ID --repo gemologic/sheen --dir /tmp/sheen-comparison-RUN_ID
```

Use full 40-character commit SHAs for repeatable comparisons, or a branch/tag name. Abbreviated SHAs are not supported by checkout and are interpreted as branch/tag names. Defaults compare the commit before the Studio redesign with current `main`; resolved SHAs are recorded in provenance. To isolate new optimization work, select the commit immediately before those changes as `base`. The dispatch ref supplies the workflow, helper, and shared harness; it does not select the application versions. Run only trusted repository commits: installation and builds execute their code.

## Read the results

Each job summary shows the normalized CPU median for both commits and the percentage change. Each `admin-comparison-*` artifact includes `comparison/provenance.json`, the adapted shared spec, build/benchmark logs, exit codes, a Markdown summary, and both applications' raw `test-results`. The benchmark JSON includes actual browser/runner hardware, calibration CPU, five raw runs, frame timings, retained-owner results, and failures.

Inspect all five paired `detailsDock` percentage changes and their spread. Consistent positive changes suggest application regression; similar results for both commits above the local baseline suggest a runner-specific offset. Order-dependent or widely scattered results require further sampling. Five runner pairs are an initial diagnostic, not proof of a stable distribution. Do not select only passing runs or replace missing measurements with zero.

Existing CPU and frame gates remain active in both measurements. Every candidate failure fails the comparison. A completed base measurement that fails only recognized CPU/frame/Long Task budgets is reported as a historical warning, with the original nonzero exit and complete failures retained. Base correctness failures, unknown failure types, missing/malformed artifacts, commit mismatches, installation/build failures, and timeouts still fail the job. The reporter requires five runs and rejects baseline-capture artifacts. Commands have a five-minute timeout. There are no automatic retries and capture mode remains disabled. This changes comparison reporting only; required main CI still enforces every existing limit.

## Shared harness and limits

Both applications use the dispatch commit's AdminApp spec, CPU/frame samplers, owner checks, Playwright config, and baseline. Preparation requires matching Playwright 1.63.0 manifests and frozen dependency installs. Chromium is installed once for both applications. Both application builds retain their own source and lockfile.

The helper applies identical, guarded compatibility adapters to both copies: theme control accepts the old inherited-theme or new Studio label; table search scopes to the common DataTable root; the existing revision label accepts either the old revision-only text or the new revision/sample text. The heavy row/chart counts are still checked. Sampling boundaries, operations, calibration, five-run medians, and correctness checks remain unchanged. Review adapters if the harness changes; unmatched replacements fail closed.

Application defaults intentionally remain different. In particular, theme-switch measures Plex → Plex before and Inter → Plex after, so that metric includes the approved product change. Details-dock follows the switch to Graphite in both versions. This diagnostic harness is not byte-identical to the required CI harness, so its absolute values are not an automatic replacement baseline.

No required CI workflow or baseline is modified. Review the paired evidence, investigate application regressions, and qualify any proposed hosted baseline against the normal harness before approving it.
