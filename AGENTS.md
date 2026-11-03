# Agent Workflow

## Change workflow

For non-trivial code changes, use this sequence: **tests → pull request → merge**.

1. Start from an up-to-date `main` and create a branch named `opsx/<change-name>` (or another descriptive kebab-case name).
2. Implement the change and add tests in the same task group as the code they cover.
3. Run the project checks before committing:
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm test`
   - `pnpm test:integration` when database, API, server, or shared-package behavior changes
4. Commit on the branch and push it to `origin`.
5. Open a pull request with `gh pr create`, including a summary and the verification commands that passed.
6. Merge the pull request once required checks pass. If review approval is required, wait for the user.
7. Do not commit directly to `main` or force-push shared branches.

## OpenSpec changes

- Use `/opsx-propose` to create planning artifacts, `/opsx-apply` to implement them, and `/opsx-archive` after the pull request is merged.
- Do not archive a change before its pull request is merged.
- Do not mark a task complete while its named verification fails.
