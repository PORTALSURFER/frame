# Browser CI execution

The browser suite runs locally with npm ci followed by FRAME_BROWSER_PATH=/path/to/chromium npm test, or with Playwright-installed Chromium. The end-to-end example runs with npm run example. The checked-in browser-tests workflow triggers on pull requests, main updates, and manual dispatch.

GitHub-hosted runs have failed before any steps execute. The initial run https://github.com/PORTALSURFER/frame/actions/runs/36715797256 and retried run https://github.com/PORTALSURFER/frame/actions/runs/36747748334 expose no step results; available job-log requests return no log blob. Rerunning failed jobs was accepted, but execution again failed before steps. This evidence does not identify a code, dependency, billing, or runner configuration cause.

A repository/account administrator should inspect the run page for an actionable service notice, repository Settings → Actions → General and Runners, and account Actions usage/availability. Address the reported restriction, then use Actions → Browser tests → Run workflow on main. Verify checkout, Node setup, npm ci, Chromium installation, and npm test actually execute and finish successfully. A successful rerun request alone is not a passing workflow.

Until a run executes, hosted browser execution remains unchecked in todo.md. Local test results are the validation evidence for the merged changes.
