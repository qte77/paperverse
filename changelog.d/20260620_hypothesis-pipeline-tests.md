### Added

- Hypothesis property-based tests for the pipeline's pure logic — `date_axis` and `l2_normalize_rows` (layout), `build_meta` and `build_positions` (export), and `ingest` dedup/version/date-sort — asserting invariants across empty/single/constant-date/unordered/duplicate-uid/float32 edge cases. (#83)
