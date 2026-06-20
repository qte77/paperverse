"""Load curated paper-eval JSONL (one JSON object per line) into Paper objects.

The ``rxiv-paper-eval`` pipeline (see ``ai-agents-research``) LLM-filters the raw rxiv
feed down to topic-relevant papers and emits one JSON object per line with the fields
``date, iso_week, doi, version, category, title, authors, abstract`` plus an
``extracted`` block (summary/methods/key_findings) that the cloud does not need and so is
ignored here. This is the "real" data source, parallel to the canonical CSVs the demo
corpus uses (see ``csv_loader``).
"""

from __future__ import annotations

import datetime
import json
from typing import TYPE_CHECKING

from paperverse.models import Paper, Source

if TYPE_CHECKING:
    from pathlib import Path


def load_jsonl(path: Path, source: Source) -> list[Paper]:
    """Parse one curated JSONL file into Paper objects for ``source``.

    Each non-blank line is a JSON object from the paper-eval pipeline. Rows are
    de-duplicated by ``(uid, version)`` and the result is sorted by publication date,
    matching the CSV loader's contract.

    Args:
        path: Path to a curated ``*.jsonl`` file.
        source: The preprint server the file belongs to (from its directory).

    Returns:
        Papers parsed from the file, deduplicated and date-sorted.

    Raises:
        json.JSONDecodeError: A line is not valid JSON.
        KeyError: A line is missing a required field (date/doi/version/category/title).
    """
    by_key: dict[tuple[str, int], Paper] = {}
    with path.open(encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            paper = _record_to_paper(json.loads(line), source)
            by_key.setdefault((paper.uid, paper.version), paper)
    return sorted(by_key.values(), key=lambda paper: paper.published)


def _record_to_paper(record: dict[str, object], source: Source) -> Paper:
    identifier = str(record["doi"])
    categories = [c.strip() for c in str(record["category"]).split(";") if c.strip()]
    return Paper(
        source=source,
        id=identifier,
        doi=None if source is Source.ARXIV else identifier,
        title=str(record["title"]),
        categories=categories,
        published=datetime.date.fromisoformat(str(record["date"])),
        version=int(str(record["version"])),
        authors=str(record.get("authors", "")),
        abstract=str(record.get("abstract", "")),
    )
