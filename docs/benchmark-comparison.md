# Paired hosted AdminApp comparison

The manual **Compare AdminApp performance** workflow compares two application commits on each of five fresh Ubuntu 24.04 runners. Each job builds both applications before measuring, runs them sequentially, and alternates base-first/candidate-first across jobs (three versus two). Each application measurement retains the normal five fresh-browser-context samples. Jobs do not cancel their peers on failure.

## Run

Commit and push the workflow and helper to the default branch first. GitHub requires a `workflow_dispatch` workflow to exist there before it can be dispatched. Then use Actions → Compare AdminApp performance → Run workflow, or:

```sh
gh workflow run benchmark-compare.yml --repo gemologic/sheen \
  -f base=d86a879170afa2a24bf11552b4a0ef50577532f3 \
  -f candidate=529f3de12acaeafbf65f9eebe5a1fc08d1ce04b4
gh run list --repo gemologic/sheen --workflow benchmark-compare.yml --limit 5
gh run watch RUN_ID --repo gemologic/sheen
gh run download RUN_ID --repo gemologic/sheen --dir /tmp/sheen-comparison-RUN_ID
```

Use full 40-character commit SHAs for repeatable comparisons, or a branch/tag name. Abbreviated SHAs are not supported by checkout and are interpreted as branch/tag names. Defaults identify the commit before the Studio redesign and the redesign commit. The dispatch ref supplies the workflow, helper, and shared harness; it does not select the application versions. Run only trusted repository commits: installation and builds execute their code.

## Read the results

Each job summary shows the normalized CPU median for both commits and the percentage change. Each `admin-comparison-*` artifact includes `comparison/provenance.json`, the adapted shared spec, build/benchmark logs, exit codes, a Markdown summary, and both applications' raw `test-results`. The benchmark JSON includes actual browser/runner hardware, calibration CPU, five raw runs, frame timings, retained-owner results, and failures.

Inspect all five paired `detailsDock` percentage changes and their spread. Consistent positive changes suggest application regression; similar results for both commits above the local baseline suggest a runner-specific offset. Order-dependent or widely scattered results require further sampling. Five runner pairs are an initial diagnostic, not proof of a stable distribution. Do not select only passing runs or replace missing measurements with zero.

Existing CPU and frame gates remain active. A budget failure still produces the normal JSON artifact, the second commit is measured, and the reporting step marks the job failed. Missing artifacts, installation/build failures, and timeouts are incomplete evidence, not performance passes. Commands have a five-minute timeout. There are no automatic retries and capture mode remains disabled.

## Shared harness and limits

Both applications use the dispatch commit's AdminApp spec, CPU/frame samplers, owner checks, Playwright config, and baseline. Preparation requires matching Playwright 1.63.0 manifests and frozen dependency installs. Chromium is installed once for both applications. Both application builds retain their own source and lockfile.

The helper applies identical, guarded compatibility adapters to both copies: theme control accepts the old inherited-theme or new Studio label; table search scopes to the common DataTable root; the existing revision label accepts either the old revision-only text or the new revision/sample text. The heavy row/chart counts are still checked. Sampling boundaries, operations, calibration, five-run medians, and correctness checks remain unchanged. Review adapters if the harness changes; unmatched replacements fail closed.

Application defaults intentionally remain different. In particular, theme-switch measures Plex → Plex before and Inter → Plex after, so that metric includes the approved product change. Details-dock follows the switch to Graphite in both versions. This diagnostic harness is not byte-identical to the required CI harness, so its absolute values are not an automatic replacement baseline.

No required CI workflow or baseline is modified. Review the paired evidence, investigate application regressions, and qualify any proposed hosted baseline against the normal harness before approving it.
