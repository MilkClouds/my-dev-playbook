# Git Commands Reference

## Preserving author and committer with --no-commit

When cherry-picking with `--no-commit` (for Modify commits in private-to-public sync), both author and committer metadata must be explicitly preserved. Without this, the committer defaults to the current git user.

```bash
# Extract all metadata from the original commit
AUTHOR_NAME=$(git log -1 --pretty=%an <hash>)
AUTHOR_EMAIL=$(git log -1 --pretty=%ae <hash>)
AUTHOR_DATE=$(git log -1 --pretty=%aD <hash>)
COMMITTER_NAME=$(git log -1 --pretty=%cn <hash>)
COMMITTER_EMAIL=$(git log -1 --pretty=%ce <hash>)
COMMITTER_DATE=$(git log -1 --pretty=%cD <hash>)
COMMIT_MSG=$(git log -1 --pretty=%B <hash>)

# Cherry-pick without committing, make modifications, then commit
git cherry-pick --no-commit <hash>
# ... apply edits ...
GIT_AUTHOR_NAME="$AUTHOR_NAME" \
GIT_AUTHOR_EMAIL="$AUTHOR_EMAIL" \
GIT_AUTHOR_DATE="$AUTHOR_DATE" \
GIT_COMMITTER_NAME="$COMMITTER_NAME" \
GIT_COMMITTER_EMAIL="$COMMITTER_EMAIL" \
GIT_COMMITTER_DATE="$COMMITTER_DATE" \
git commit -m "$COMMIT_MSG"
```

## Detecting conflict resolution in merge commits

A merge commit with no unique changes is safe to skip — the child commits already carry everything. But conflict resolutions only exist in the merge commit itself.

```bash
# Show what the merge introduced relative to its first parent
git show --diff-merges=first-parent --stat <merge_hash>
```

If the output is empty, skip safely. If it shows file changes, those are conflict resolutions (or "evil merges") — present the diff to the user for review.
