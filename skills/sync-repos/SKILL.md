---
name: sync-repos
description: Synchronizes commits between two git remotes with unrelated histories via cherry-pick, preserving original authorship and committer metadata. Use when the user asks to sync repos, bring upstream changes, push to public, cherry-pick between remotes, or mentions syncing a fork. Also triggers on "sync from upstream", "push changes to public", "bring in latest changes", "pull from public repo", or any mention of keeping two repositories in sync.
---

# Sync Repos

Cherry-pick commits between two git remotes that have no shared history, preserving author and committer metadata. Designed for repos that diverged after a force-push or independent initialization.

## Configuration

Two files in `.sync-repos/` control this skill:

### `.sync-repos/state.json` (required)

Tracks which remotes to sync and the last synced commit on each side. If this file doesn't exist, start with Initial Setup (below).

```json
{
  "remotes": {
    "origin": { "url": "https://github.com/org-a/repo", "branch": "main" },
    "upstream": { "url": "https://github.com/org-b/repo", "branch": "main" }
  },
  "last_sync": {
    "origin_hash": "abc1234",
    "upstream_hash": "def5678",
    "synced_at": "2026-03-23T00:00:00Z"
  }
}
```

### `.sync-repos/guide.md` (optional)

Natural-language guidelines for private-to-public sensitivity review. Read this file during Phase 2 to decide which commits need modification or exclusion. Without it, rely on general judgment and inform the user that this file can be created for more precise guidance.

## Workflow

This skill has 4 phases with 3 approval gates. The user must explicitly approve before any cherry-pick, push, or PR creation happens, because sync mistakes are hard to undo and can leak sensitive content.

### Initial Setup

Run this when `.sync-repos/state.json` doesn't exist.

1. List configured git remotes (`git remote -v`).
2. Ask the user which two remotes to sync and their target branches.
3. Show the latest commits on each target branch.
4. Ask the user for the last synced commit hash on each side: the point after which changes are unsynced. If the repos were never synced, pick a known common state (e.g. the initial public release commit).
5. Write `.sync-repos/state.json` after user confirms the contents.

### Phase 1: Confirm Context

1. Read `.sync-repos/state.json` and fetch both remotes. If the repo uses Git LFS, also run `git lfs fetch <source-remote> --all`. Cherry-pick will fail with smudge errors if LFS objects aren't cached locally.
2. Count new commits since last sync on each side.
3. Present a status table showing each remote's last synced hash, current HEAD, and number of new commits.
4. Ask the user to confirm the remotes/branches are correct and choose a direction: **(1) A → B** or **(2) B → A**.
5. If the direction is private-to-public and `.sync-repos/guide.md` doesn't exist, mention it: "`.sync-repos/guide.md` not found. This file can provide repo-specific guidelines for identifying sensitive content. Proceeding with general-purpose review."

**Wait for explicit confirmation before continuing.**

### Phase 2: Analyze and Plan

1. List non-merge commits to cherry-pick (oldest first).
2. Check each merge commit for conflict resolution changes using `git show --diff-merges=first-parent --stat`. Merge commits with no unique diff are safe to skip (their child commits already cover the changes). Flag any with unique changes so the user can decide. See `references/git-commands.md` for details.
3. Show the aggregate diff stat.
4. Detect potential conflicts: files changed on the source that also changed on the target since last sync.
5. **Private-to-public only**: read `.sync-repos/guide.md` (if present), then review each commit's diff and classify it:
   - **Clean**: safe to publish as-is. Use normal `git cherry-pick`.
   - **Modify**: contains sensitive content that can be redacted. Use `cherry-pick --no-commit`, apply edits, then commit with preserved metadata. See `references/git-commands.md` for the exact environment variable approach.
   - **Exclude**: entirely private, should not go public. Skip it.
6. Present the full plan: commit table (with classification column for private-to-public), merge commit summary, files affected, potential conflicts.
7. End with: *"I will not execute any cherry-picks, commits, or pushes until you explicitly approve."*

The user approves the recommended plan, requests adjustments, or aborts.

### Phase 3: Cherry-Pick on Sync Branch

After user approval:

1. Verify the working tree is clean.
2. Create a sync branch: `sync/<source>-to-<target>/<YYYY-MM-DD>`.
3. Cherry-pick each approved commit according to its classification. For Modify commits, follow the metadata-preserving approach in `references/git-commands.md`. On conflict, stop and ask the user whether to resolve, skip, or abort. On empty commit (already applied), skip with a note.
4. Show a summary: how many applied, modified, excluded, skipped.
5. Ask: *"Push this branch and create a PR?"*

**Wait for explicit approval before pushing.**

### Phase 4: Push, PR, and State Update

1. Push the sync branch.
2. Create a PR targeting the target branch.
   - **Public-to-private (or same-org)**: Title: `sync: <source> → <target> (<date>)`. Body: commit summary, files changed, modifications made.
   - **Private-to-public**: The PR title and body must not mention the private org name, the word "sync", or reveal the existence of a private fork. Write the PR as if it were a normal feature/fix PR; describe the changes by their content, not their origin.
   - **PR/issue references**: Commit messages may contain `#<number>` references (e.g. `(#34)`) that point to the source repo, not the target. In the PR body, qualify these with the full `owner/repo#number` format so readers aren't misled by bare `#N` links resolving to unrelated target-repo issues.
3. Ask the user which merge strategy they will use. Recommend **merge commit**: squash and rebase rewrite commit hashes, which complicates state tracking.
4. Update `.sync-repos/state.json` based on the chosen strategy:

   **If merge commit**, update state on the sync branch before the PR is merged:
   - Set the target remote's hash to the sync branch HEAD (the last cherry-picked commit).
   - Set the source remote's hash to its current HEAD.
   - Commit as the final commit on the sync branch, then push. Show the PR link.

   **If squash or rebase**, update state after the user merges the PR:
   - Do NOT update state on the sync branch (these strategies rewrite commit hashes, making sync branch references unreachable).
   - Push and show the PR link.
   - After the user confirms the PR is merged, update `.sync-repos/state.json` on the target's main branch; set both hashes to their respective remote HEADs post-merge. Commit and push.

## Key Principles

Cherry-picking onto the target branch directly is risky; a sync branch with a PR gives the user a chance to review the full diff and revert cleanly if something goes wrong.

Merge commits can't be cherry-picked directly (git doesn't know which parent to diff against). Skipping them is usually correct because the individual commits already carry the changes, but merge commits sometimes contain conflict resolution code that exists nowhere else. That's why Phase 2 checks each one.

Sensitive content must never enter git history in private-to-public sync; once pushed, it's in the reflog even after force-push. The `--no-commit` approach ensures redaction happens before the commit is created.

Author and committer metadata (name, email, date) are preserved through environment variables when using `--no-commit`. This matters because cherry-pick normally handles this automatically, but `--no-commit` followed by a manual commit would default to the current user's identity.

Force-pushing is never appropriate in this workflow. If a push is rejected, ask the user rather than forcing.
