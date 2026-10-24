### Changed

- The bump, tag and publish release workflows now call the shared `qte77/.github`
  reusable workflows (SHA-pinned) instead of inline steps; the bump commit is signed
  via the GitHub API, and `tag-release` gains a `workflow_dispatch` dry run (#148).
