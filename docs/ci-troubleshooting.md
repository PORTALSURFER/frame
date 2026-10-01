# Local CI execution

Frame uses local CI instead of GitHub-hosted Actions. Run the complete validation from the repository root with Node.js 20 or newer and npm:

```sh
npm run ci
```

The command installs the exact dependencies from `package-lock.json` with `npm ci`, installs Playwright Chromium, runs every model/browser test, and runs the end-to-end review example. It stops at the first failure and exits with a nonzero status. Run it before submitting or accepting changes; there is no automatic GitHub check.

Successful runs produce screenshots, feedback, a portable project, and the example's review report in `artifacts/local-ci/`. `ci-report.json` records the stage results, Node version, commit, whether the checkout was dirty, and start/finish times. A dirty checkout means the report validates local changes as well as the recorded commit. Artifacts are ignored by Git. `FRAME_OUTPUT_DIR` selects a different output directory; an old example artifact is not evidence that the current run passed, so check the CI report and exit status.

To use an existing Chromium installation and skip the browser download:

```sh
FRAME_BROWSER_PATH=/absolute/path/to/chromium npm run ci
```

Tests use a local HTTP server and isolated browser storage. Some managed Chromium installations block file URLs; the file-URL test explicitly reports a skip under that policy. Use Playwright Chromium for full coverage. If Chromium cannot launch on Linux because system libraries are missing, install its host dependencies with `npx playwright install --with-deps chromium`, then rerun local CI. This may require administrator access. Dependency and browser installation require network access.

## Why hosted Actions was removed

The [failed main run](https://github.com/PORTALSURFER/frame/actions/runs/36752840326) at commit `844f3b44b9e28017c1a444fa3b0a3fcb6f38a75a` never executed job steps. Its check annotations reported an account payment or spending-limit restriction. Local CI replaces that workflow without changing account billing. Hosted execution is no longer an acceptance requirement.
