# Architecture Decision Records

Format: [MADR](https://adr.github.io/madr/) — filenames `NNNN-kebab.md`,
numbers assigned sequentially and never reused.

+ [0001](0001-backend-cli-ui-separation.md) — Backend / CLI / UI
  separation (four-layer, greenfield) — Accepted 2026-06-13
+ [0002](0002-in-browser-store-and-data-contract.md) — In-browser store
  (SQLite + FTS5 over DuckDB-WASM) & export data contract — Accepted 2026-06-14

New ADR: copy the most recent file, increment the number, fill in
**Status / Context / Decision / Consequences**. Supersedes / amendments
go in the **Status** line of both ADRs.
