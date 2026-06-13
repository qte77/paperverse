"""Load canonical-schema CSV files into Paper objects."""

from __future__ import annotations

import csv
import datetime
from typing import TYPE_CHECKING

from paperverse.models import Paper, Source

if TYPE_CHECKING:
    from pathlib import Path


def load_csv(path: Path, source: Source) -> list[Paper]:
    """Parse one canonical CSV file into Paper objects for ``source``.

    The producer's canonical columns are
    ``Date, ISOWeek, DOI, Version, Category, Title, Authors, Abstract``.
    Rows are de-duplicated by ``(uid, version)`` and the result is sorted
    by publication date.

    Args:
        path: Path to a canonical weekly CSV file.
        source: The preprint server the file belongs to.

    Returns:
        Papers parsed from the file, deduplicated and date-sorted.
    """
    by_key: dict[tuple[str, int], Paper] = {}
    with path.open(encoding="utf-8", newline="") as handle:
        for row in csv.DictReader(handle):
            paper = _row_to_paper(row, source)
            by_key.setdefault((paper.uid, paper.version), paper)
    return sorted(by_key.values(), key=lambda paper: paper.published)


def _row_to_paper(row: dict[str, str], source: Source) -> Paper:
    identifier = row["DOI"]
    categories = [c.strip() for c in row["Category"].split(";") if c.strip()]
    return Paper(
        source=source,
        id=identifier,
        doi=None if source is Source.ARXIV else identifier,
        title=row["Title"],
        categories=categories,
        published=datetime.date.fromisoformat(row["Date"]),
        version=int(row["Version"]),
        authors=row["Authors"],
        abstract=row["Abstract"],
    )
