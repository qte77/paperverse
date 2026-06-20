"""Load curated paper-eval JSONL (one JSON object per line) into Paper objects.

The ``rxiv-paper-eval`` pipeline (see ``ai-agents-research``) LLM-filters the raw rxiv
feed down to topic-relevant papers and emits one JSON object per line with the fields
``date, iso_week, doi, version, category, title, authors, abstract`` plus an
``extracted`` block (summary/subjects/methods/key_findings/study_type). The eval often
leaves ``authors`` blank, so we fall back to ``extracted.subjects`` for a contributors
line, and carry ``extracted.summary`` / ``extracted.key_findings`` onto the paper for the
detail panel (``methods`` / ``study_type`` are not surfaced). This is the "real" data
source, parallel to the canonical CSVs the demo corpus uses (see ``csv_loader``).
"""

from __future__ import annotations

import datetime
import json
from typing import TYPE_CHECKING, cast

from paperverse.models import Paper, Source

if TYPE_CHECKING:
    from pathlib import Path


def _str_list(value: object) -> list[str]:
    """Coerce a JSON array to ``list[str]``; anything else (incl. missing) becomes ``[]``."""
    if not isinstance(value, list):
        return []
    return [str(item) for item in cast("list[object]", value)]


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
    raw_extracted = record.get("extracted")
    extracted: dict[str, object] = (
        cast("dict[str, object]", raw_extracted) if isinstance(raw_extracted, dict) else {}
    )
    # The eval frequently leaves authors blank; fall back to the extracted subjects.
    authors = str(record.get("authors", "")).strip()
    if not authors:
        authors = "; ".join(_str_list(extracted.get("subjects")))
    return Paper(
        source=source,
        id=identifier,
        doi=None if source is Source.ARXIV else identifier,
        title=str(record["title"]),
        categories=categories,
        published=datetime.date.fromisoformat(str(record["date"])),
        version=int(str(record["version"])),
        authors=authors,
        abstract=str(record.get("abstract", "")),
        summary=str(extracted.get("summary", "")),
        key_findings=_str_list(extracted.get("key_findings")),
    )
