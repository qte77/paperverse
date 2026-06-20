### Added

- The real-paper detail panel now shows the paper-eval `summary` and `key findings` (persisted into `papers.db`); these sections stay hidden for demo papers, which have neither. (#92)

### Changed

- Real papers with a blank `authors` field now fall back to the eval's extracted `subjects` for the contributors line, so a real paper no longer opens with an empty author slot. (#92)
