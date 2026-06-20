"""Export papers to a SQLite + FTS5 store, a Float32 positions binary, and meta JSON.

Three artifacts feed the UI: ``papers.db`` (cold metadata path: a ``papers`` table
indexed on source/published, plus an external-content FTS5 index over
title/authors/abstract), ``positions.bin`` (hot render path: little-endian
Float32 ``[x, y, z]`` per point), and ``meta.json`` (first-paint path: paper
count, date endpoints, and the per-point source list). Point ``i`` in the binary
and ``sources[i]`` in the JSON both correspond to ``papers.idx = i``, so the
renderer can colour and index by row without opening the database.
"""

from __future__ import annotations

import json
import sqlite3
import struct
from typing import TYPE_CHECKING, TypedDict

if TYPE_CHECKING:
    from collections.abc import Sequence
    from pathlib import Path

    from paperverse.layout import Position
    from paperverse.models import Paper

_SCHEMA = """
CREATE TABLE papers (
    idx INTEGER PRIMARY KEY,
    uid TEXT NOT NULL UNIQUE,
    source TEXT NOT NULL,
    title TEXT NOT NULL,
    categories TEXT NOT NULL,
    published TEXT NOT NULL,
    version INTEGER NOT NULL,
    authors TEXT NOT NULL DEFAULT '',
    abstract TEXT NOT NULL DEFAULT '',
    summary TEXT NOT NULL DEFAULT '',
    key_findings TEXT NOT NULL DEFAULT '[]',
    doi TEXT,
    x REAL NOT NULL,
    y REAL NOT NULL,
    z REAL NOT NULL,
    r REAL NOT NULL DEFAULT 1.0
);
CREATE INDEX idx_papers_source ON papers(source);
CREATE INDEX idx_papers_published ON papers(published);
CREATE VIRTUAL TABLE papers_fts USING fts5(
    title, authors, abstract, content='papers', content_rowid='idx'
);
"""

_INSERT = (
    "INSERT INTO papers "
    "(idx, uid, source, title, categories, published, version, authors, abstract, "
    "summary, key_findings, doi, x, y, z) "
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
)

_POPULATE_FTS = (
    "INSERT INTO papers_fts(rowid, title, authors, abstract) "
    "SELECT idx, title, authors, abstract FROM papers"
)


def _position_of(paper: Paper, positions: dict[str, Position]) -> Position:
    """Return a paper's (x, y, z), failing loudly if it was never laid out."""
    try:
        return positions[paper.uid]
    except KeyError:
        raise ValueError(f"missing layout position for {paper.uid!r}") from None


def build_positions(papers: Sequence[Paper], positions: dict[str, Position]) -> bytes:
    """Pack each paper's (x, y, z) as little-endian Float32, in paper order.

    Point ``i`` in the buffer is ``papers[i]`` (== ``papers.idx``), so the UI
    can index the binary by row.

    Args:
        papers: Papers in the order the binary should follow.
        positions: Mapping of uid -> (x, y, z) from ``layout()``.

    Returns:
        ``len(papers) * 12`` bytes (three float32 per point).
    """
    coords: list[float] = []
    for paper in papers:
        coords.extend(_position_of(paper, positions))
    return struct.pack(f"<{len(coords)}f", *coords)


class MetaJson(TypedDict):
    """The ``meta.json`` payload the UI reads for first paint and the axis legend.

    ``sources`` is parallel to ``positions.bin`` (entry ``i`` == ``papers.idx = i``),
    so the renderer can colour points by source without opening ``papers.db``.
    """

    count: int
    dateMin: str
    dateMax: str
    sources: list[str]


def build_meta(papers: Sequence[Paper]) -> MetaJson:
    """Build the ``meta.json`` payload: count, ISO date endpoints, per-point sources.

    First paint reads this small file so the cloud renders (coloured by source) and
    labels its date axis without waiting on ``papers.db`` or the sql.js WASM. Date
    endpoints scan the whole corpus (``min``/``max``), independent of paper order.

    Args:
        papers: Papers in the order the export artifacts follow.

    Returns:
        The payload; an empty corpus yields ``count=0`` with empty endpoints.
    """
    if not papers:
        return {"count": 0, "dateMin": "", "dateMax": "", "sources": []}
    published = [paper.published for paper in papers]
    return {
        "count": len(papers),
        "dateMin": min(published).isoformat(),
        "dateMax": max(published).isoformat(),
        "sources": [paper.source.value for paper in papers],
    }


def build_db(papers: Sequence[Paper], positions: dict[str, Position], db_path: Path) -> None:
    """Write ``papers.db``: a papers table, source/published indexes, and FTS5.

    Uses external-content FTS5 (``content='papers'``) so the searchable text is
    not duplicated. Every value is bound as a parameter; the FTS index is built
    once and is queryable read-only thereafter.

    Args:
        papers: Papers to store, in stable (published-sorted) order.
        positions: Mapping of uid -> (x, y, z) from ``layout()``.
        db_path: Destination path for the SQLite database (overwritten).
    """
    rows = [
        (
            idx,
            paper.uid,
            paper.source.value,
            paper.title,
            json.dumps(paper.categories),
            paper.published.isoformat(),
            paper.version,
            paper.authors,
            paper.abstract,
            paper.summary,
            json.dumps(paper.key_findings),
            paper.doi,
            *_position_of(paper, positions),
        )
        for idx, paper in enumerate(papers)
    ]
    db_path.unlink(missing_ok=True)
    con = sqlite3.connect(db_path)
    try:
        con.executescript(_SCHEMA)
        con.executemany(_INSERT, rows)
        con.execute(_POPULATE_FTS)
        con.commit()
    finally:
        con.close()


def export(
    papers: Sequence[Paper], positions: dict[str, Position], out_dir: Path
) -> tuple[Path, Path, Path]:
    """Write all three export artifacts into ``out_dir`` and return their paths.

    Args:
        papers: Papers to export, in stable order.
        positions: Mapping of uid -> (x, y, z) from ``layout()``.
        out_dir: Directory to receive ``papers.db``, ``positions.bin``, and
            ``meta.json``.

    Returns:
        ``(db_path, positions_path, meta_path)``.
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    db_path = out_dir / "papers.db"
    positions_path = out_dir / "positions.bin"
    meta_path = out_dir / "meta.json"
    build_db(papers, positions, db_path)
    positions_path.write_bytes(build_positions(papers, positions))
    meta_path.write_text(json.dumps(build_meta(papers)))
    return db_path, positions_path, meta_path
