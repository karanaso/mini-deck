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

## Multi-agent roles

Agent definitions live in `.opencode/agents/`; the filename is the agent ID.

| Agent | Mode | Responsibility |
| --- | --- | --- |
| `architect` | primary | Assigns work, owns shared surfaces, integrates branches, resolves conflicts, runs the final gate |
| `dev-fe` | subagent | Frontend implementation and UI tests |
| `dev-be` | subagent | Backend, database, and collaboration implementation and tests |
| `reviewer` | subagent | Read-only independent review before PR creation |

Use one `architect`, one `dev-fe`, one `dev-be`, and one `reviewer` per change. Do not create two lead agents for the same integration; ambiguous merge authority causes more conflicts than it resolves.

## File ownership

| Owner | Paths |
| --- | --- |
| `dev-fe` | `apps/web/src/components/**`, `apps/web/src/app/**` except `api`, `apps/web/src/hooks/**`, `apps/web/src/store/**`, `apps/web/src/lib/i18n/**`, UI tests |
| `dev-be` | `apps/web/src/app/api/**`, `apps/web/src/server/**`, `packages/db/**`, `apps/collab/**`, API/database/collaboration tests |
| `architect` | `packages/deck/**`, cross-cutting `apps/web/src/lib/**`, root configuration, `openspec/**`, CI, lockfiles |

The `apps/web/src/lib/**` directory mixes client and server helpers. Treat it as architect-owned unless the architect explicitly assigns a file to one developer. Cross-boundary changes require the architect, not a direct edit.

## Worktree isolation

- One OpenSpec change per worktree and branch.
- Create and commit the OpenSpec change on `main` first, then branch worktrees from that commit.
- Use a sibling worktree directory or the native worktree tooling. Do not nest worktrees inside the repository root.
- Each worktree needs its own uncommitted environment configuration; never commit secrets.
- Worktrees isolate files, not services. Integration tests expect PostgreSQL on `5433`, the web app uses `3000`, collaboration uses `1234`, and assets use `.data`. Allocate separate ports/databases per worktree, or serialize integration and E2E runs.
- Do not run `openspec archive` in two worktrees concurrently.

## Integration and conflict resolution

The `architect` is the only integration owner.

1. Integrate backend and contract work first, then frontend, unless the change proves a different dependency order.
2. Private, unpushed branch: `git rebase origin/main` is allowed.
3. Pushed or under-review branch: prefer `git merge origin/main`. Do not rewrite shared history without coordination.
4. Resolve conflicts by the intent in the OpenSpec spec, not by which side is easier.
   - Conflicts confined to frontend paths are resolved in the `dev-fe` branch.
   - Conflicts confined to backend paths are resolved in the `dev-be` branch.
   - Cross-boundary conflicts are resolved by the architect, then verified by the owning developer.
5. After conflict resolution, run the targeted tests, then the full verification gate, then re-run the reviewer.
6. Push, let required CI pass, and merge the PR. Do not merge with failing checks.
7. Update the remaining worktree with the new `main` before it continues.

Do not encode git, test, or merge policy in `openspec/config.yaml`. OpenSpec rules are scoped to artifacts and cannot execute commands.

## Review and verification gate

- `reviewer` is read-only and must return `PASS` before a PR is opened.
- Re-run `reviewer` after any conflict resolution or scope change.
- Do not weaken, disable, or delete a test merely to make a check pass.
- When behavior intentionally changes, update the test together with the spec and explain it in the PR.
- CI checks and branch protection are the hard gate; agent instructions are advisory.

## OpenSpec changes

- Use `/opsx-propose` to create planning artifacts, `/opsx-apply` to implement them, and `/opsx-archive` after the pull request is merged.
- Do not archive a change before its pull request is merged.
- Do not mark a task complete while its named verification fails.
- Archive one change at a time against an up-to-date `main`.
