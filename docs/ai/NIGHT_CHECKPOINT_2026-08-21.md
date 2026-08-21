# RavRadar night checkpoint - 2026-08-21

Prepared before the required 06:20 Europe/Copenhagen stop.

## Durable state

- Worktree: `C:\Users\jakob\AppData\Local\Temp\ravradar-provisional-weights-4.0.242`
- Branch: `codex/trip-evidence-contract-4.0.243`
- Pull request: `#31`, still draft, merge state clean.
- Remote PR head: `8a7016c7b9828131be2ef660f0adc93cab5c9244`.
- Exact-head PR gate: green, run `32430076625`.
- Local branch is clean and five commits ahead of the remote branch.

Local commits not yet pushed:

- `95022593 release(trips): prepare 4.0.243 evidence contract`
- `e60b8964 docs(trips): record production schema gate`
- `3f5c475b fix(trips): align evidence upload with production schema`
- `ac3a0163 docs(ops): record resolved egress trend`
- `1925fda0 test(observations): lock production schema mapping`

## Completed and verified

- The privacy-first trip evidence v2 contract is implemented, documented and locally validated.
- Production `observations` schema compatibility, idempotent upload mapping and strict RLS were applied and verified without reading private rows.
- The synthetic production insert check ran transactionally and was rolled back; no test observation remains.
- Full local source validation and release gate passed after the final schema fix.
- The permanent production mapping regression test passed.
- A local mobile Browser-plugin flow check passed with all 210 zones available, measured trip duration, completion dialog and no browser errors.
- Natural production run `32443500157` built fresh data, ran the full validation and release gates, deployed main commit `e8a9ac6ca8c083db16cdf3d8ab48ecd22c596079`, and the live page confirmed version `4.0.242`.
- Copernicus pilot artifacts `105`, `106` and `107` passed leakage protection and remained stable at 625 of 673 coastal parts with an exact paired current sample. They remain private and score-neutral.

## Deliberate release block

Commit `95022593` accidentally contains four generated files that must not be pushed as release content:

- `node_modules/.package-map.json`
- `node_modules/.pnpm-workspace-state-v1.json`
- `pnpm-lock.yaml`
- `scripts/lib/__pycache__/copernicus_target_identity.cpython-312.pyc`

Removal was not performed because the approval layer requires a fresh explicit owner approval before deleting these tracked files. The project uses `package-lock.json`; `.gitignore` now excludes these generated paths. No history rewrite or workaround was attempted.

## Exact resume sequence

1. Obtain explicit approval to remove the four generated files above from the branch.
2. Remove them with a corrective commit; do not amend or rewrite history.
3. Run the targeted mapping test, full source validation/release gate and `git diff --check` on the exact corrected head.
4. Push the five existing commits plus the corrective commit.
5. Update PR `#31`, wait for exact-head strict gates, and merge only if the full RavRadar release contract is genuinely green.
6. Verify the merge commit and following production deployment.
7. Because v4.0.243 changes the public trip UI and evidence contract, run the full post-production Browser-plugin audit of 210 zones and 673 coastal parts, including arrow, score and explanation agreement. Use Chromium/Playwright only if the Browser plugin cannot complete it.
8. Continue to learning and score calibration only after the trip contract is in production. Keep weights at 25/40/35 until the research-backed rules are ready.

## Safety boundaries

- Do not move land or water points.
- Do not touch the four protected dirty files in the Desktop worktree.
- Do not publish raw/private observations, credentials, current-vector payloads or complete diagnostics.
- Do not merge around a red or uncertain gate.
