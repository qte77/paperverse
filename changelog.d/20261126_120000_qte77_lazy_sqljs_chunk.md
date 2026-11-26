### Changed

- `ui/`: the sql.js runtime now ships as its own chunk, imported in the background load
  after first paint and fetched in parallel with `papers.db`. The entry chunk shrinks from
  625 kB to 577 kB (gzip 160 kB to 145 kB); behaviour is unchanged.
