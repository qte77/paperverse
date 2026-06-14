# Sample data

Throwaway demo corpus for the GitHub Pages live render (STORY-012). These rows are
**fully invented** (titles, authors, abstracts) across arxiv/biorxiv/medrxiv, in the
canonical schema `Date,ISOWeek,DOI,Version,Category,Title,Authors,Abstract`.

Replace with real feeds once the producer (`gha-rxiv-feed-action`, issue #107) lands.
The pipeline ingests `data/<source>/.../*.csv`:

```bash
uv run paperverse --data-dir data --output ui/public/data
```
