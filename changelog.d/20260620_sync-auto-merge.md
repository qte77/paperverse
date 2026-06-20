### Changed

- The weekly `sync-real-feed` workflow now auto-merges its own PR (`gh pr merge --auto --squash`), so a new curated week refreshes the deployed Real dataset on green with no manual merge step. (#92)
