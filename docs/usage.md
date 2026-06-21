# Usage

Lay out and export a corpus to `papers.db`, `positions.bin`, and `meta.json`:

```bash
uv run paperverse --data-dir data --output dist/data
```

`--data-dir` holds one subdirectory per source, each with canonical CSVs
(`Date,ISOWeek,DOI,Version,Category,Title,Authors,Abstract`):

```text
data/
  arxiv/.../*.csv
  biorxiv/.../*.csv
  medrxiv/.../*.csv
```

| Flag | Default | Description |
| --- | --- | --- |
| `--data-dir` | `data` | Root holding one CSV subdirectory per source |
| `--output` | `dist/data` | Directory to receive `papers.db`, `positions.bin`, and `meta.json` |
| `--sources` | all | Restrict to sources; repeatable (`--sources arxiv --sources biorxiv`) |
| `--seed` | `42` | UMAP seed for reproducible layouts |

How the pipeline turns these CSVs into the export artifacts is in
[architecture.md](architecture.md).
