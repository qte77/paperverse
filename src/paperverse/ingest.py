"""Ingest canonical CSVs from multiple source directories into Paper objects."""

from __future__ import annotations

from typing import TYPE_CHECKING

from paperverse.adapters.csv_loader import load_csv
from paperverse.models import Paper, Source

if TYPE_CHECKING:
    from pathlib import Path


def source_from_dir(name: str) -> Source | None:
    """Map a data subdirectory name to a Source, or None if unrecognized."""
    try:
        return Source(name)
    except ValueError:
        return None


def ingest(data_root: Path) -> list[Paper]:
    """Ingest canonical CSVs under ``data_root/<source>/`` into Paper objects.

    Each immediate subdirectory of ``data_root`` named after a known source
    (arxiv/biorxiv/medrxiv) is scanned recursively for ``*.csv``. Records are
    de-duplicated to one Paper per uid (highest version wins) and returned
    sorted by publication date.

    Args:
        data_root: Directory holding one subdirectory per source.

    Returns:
        Deduplicated, date-sorted papers across all recognized sources.
    """
    latest: dict[str, Paper] = {}
    for server_dir in sorted(p for p in data_root.iterdir() if p.is_dir()):
        source = source_from_dir(server_dir.name)
        if source is None:
            continue
        for csv_path in sorted(server_dir.rglob("*.csv")):
            for paper in load_csv(csv_path, source):
                seen = latest.get(paper.uid)
                if seen is None or paper.version > seen.version:
                    latest[paper.uid] = paper
    return sorted(latest.values(), key=lambda paper: paper.published)
