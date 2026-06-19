"""Behaviour tests for the SQLite + FTS5 + positions-binary export.

The value-add logic is ours: the ``papers.db`` schema (table + indexes +
external-content FTS5), the FTS5 search contract over title/authors/abstract,
the parameterized-SQL guarantee (injection input is stored as data), and the
little-endian Float32 positions binary whose point index ``i`` lines up with
``papers.idx = i``. SQLite's own storage/FTS internals are the library's
concern, not re-tested here.
"""

import datetime
import json
import sqlite3
import struct
from pathlib import Path

import pytest
from inline_snapshot import snapshot

from paperverse.db import build_db, build_meta, build_positions, export
from paperverse.models import Paper, Source

Positions = dict[str, tuple[float, float, float]]


def _paper(
    rawid: str,
    *,
    title: str = "t",
    categories: list[str] | None = None,
    authors: str = "",
    abstract: str = "",
    day: int = 1,
    published: datetime.date | None = None,
    source: Source = Source.ARXIV,
    version: int = 1,
) -> Paper:
    return Paper(
        source=source,
        id=rawid,
        title=title,
        categories=categories if categories is not None else ["cs.LG"],
        published=published if published is not None else datetime.date(2024, 1, day),
        version=version,
        authors=authors,
        abstract=abstract,
    )


def _positions(papers: list[Paper]) -> Positions:
    # Values exactly representable in float32 so the binary round-trips exactly.
    return {p.uid: (float(i), float(i) + 0.5, float(i) * 0.25) for i, p in enumerate(papers)}


def test_export_writes_all_three_artifacts(tmp_path: Path) -> None:
    papers = [_paper("a", day=1), _paper("b", day=2, source=Source.BIORXIV)]
    db_path, bin_path, meta_path = export(papers, _positions(papers), tmp_path)
    assert db_path == tmp_path / "papers.db"
    assert bin_path == tmp_path / "positions.bin"
    assert meta_path == tmp_path / "meta.json"
    assert db_path.exists()
    assert bin_path.exists()
    assert meta_path.exists()
    # meta.json carries the real payload, in point order, not an empty stub.
    meta = json.loads(meta_path.read_text())
    assert meta["count"] == 2
    assert meta["sources"] == ["arxiv", "biorxiv"]


def test_build_meta_reports_count_dates_and_sources_in_point_order() -> None:
    # dateMin/dateMax must scan all papers (min/max), not read the first/last
    # element: the min is last here and the max is in the middle.
    papers = [
        _paper("a", published=datetime.date(2021, 1, 30), source=Source.ARXIV),
        _paper("b", published=datetime.date(2023, 6, 1), source=Source.BIORXIV),
        _paper("c", published=datetime.date(2019, 3, 15), source=Source.MEDRXIV),
    ]
    meta = build_meta(papers)
    assert meta["count"] == 3
    assert meta["dateMin"] == "2019-03-15"
    assert meta["dateMax"] == "2023-06-01"
    # sources stay in paper/idx order (== positions.bin order), never sorted.
    assert meta["sources"] == ["arxiv", "biorxiv", "medrxiv"]


def test_build_meta_single_paper_has_equal_endpoints() -> None:
    papers = [_paper("solo", published=datetime.date(2021, 3, 10), source=Source.MEDRXIV)]
    meta = build_meta(papers)
    assert meta["count"] == 1
    assert meta["dateMin"] == "2021-03-10"
    assert meta["dateMax"] == "2021-03-10"
    assert meta["sources"] == ["medrxiv"]


def test_build_meta_empty_corpus_returns_sentinel() -> None:
    assert build_meta([]) == {"count": 0, "dateMin": "", "dateMax": "", "sources": []}


def test_build_db_contains_all_papers_with_positions(tmp_path: Path) -> None:
    papers = [_paper(str(i), day=1 + i) for i in range(5)]
    pos = _positions(papers)
    db_path = tmp_path / "papers.db"
    build_db(papers, pos, db_path)

    con = sqlite3.connect(db_path)
    rows = con.execute("SELECT uid, x, y, z FROM papers ORDER BY idx").fetchall()
    con.close()

    assert [r[0] for r in rows] == [p.uid for p in papers]
    assert [(r[1], r[2], r[3]) for r in rows] == [pos[p.uid] for p in papers]


def test_schema_structure_matches_snapshot(tmp_path: Path) -> None:
    papers = [_paper("a")]
    db_path = tmp_path / "papers.db"
    build_db(papers, _positions(papers), db_path)

    con = sqlite3.connect(db_path)
    # Only the objects we author: skip the implicit UNIQUE autoindex (sql IS NULL)
    # and the FTS5 shadow tables (papers_fts_*).
    rows = con.execute(
        "SELECT name, sql FROM sqlite_master "
        "WHERE sql IS NOT NULL AND name NOT LIKE 'papers_fts_%' "
        "ORDER BY name"
    ).fetchall()
    con.close()

    assert {name: sql for name, sql in rows} == snapshot(
        {
            "idx_papers_published": "CREATE INDEX idx_papers_published ON papers(published)",
            "idx_papers_source": "CREATE INDEX idx_papers_source ON papers(source)",
            "papers": """\
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
    doi TEXT,
    x REAL NOT NULL,
    y REAL NOT NULL,
    z REAL NOT NULL,
    r REAL NOT NULL DEFAULT 1.0
)\
""",
            "papers_fts": """\
CREATE VIRTUAL TABLE papers_fts USING fts5(
    title, authors, abstract, content='papers', content_rowid='idx'
)\
""",
        }
    )


def test_indexes_exist_on_source_and_published(tmp_path: Path) -> None:
    papers = [_paper("a")]
    db_path = tmp_path / "papers.db"
    build_db(papers, _positions(papers), db_path)

    con = sqlite3.connect(db_path)
    indexed = {
        row[0]
        for row in con.execute(
            "SELECT name FROM sqlite_master WHERE type = 'index' AND sql IS NOT NULL"
        )
    }
    con.close()

    assert "idx_papers_source" in indexed
    assert "idx_papers_published" in indexed


def test_fts5_search_matches_across_title_authors_abstract(tmp_path: Path) -> None:
    papers = [
        _paper("q", title="Quantum entanglement", abstract="superconducting qubits", day=1),
        _paper(
            "g", title="Graph networks", authors="Ada Lovelace", abstract="message passing", day=2
        ),
    ]
    db_path = tmp_path / "papers.db"
    build_db(papers, _positions(papers), db_path)

    con = sqlite3.connect(db_path)

    def search(term: str) -> list[str]:
        return [
            row[0]
            for row in con.execute(
                "SELECT p.uid FROM papers_fts f JOIN papers p ON p.idx = f.rowid "
                "WHERE papers_fts MATCH ? ORDER BY rank",
                (term,),
            )
        ]

    assert search("qubits") == ["arxiv:q"]  # abstract hit
    assert search("Lovelace") == ["arxiv:g"]  # authors hit
    assert search("networks") == ["arxiv:g"]  # title hit
    con.close()


def test_sql_injection_title_is_stored_as_data(tmp_path: Path) -> None:
    evil = "'); DROP TABLE papers;--"
    papers = [_paper("x", title=evil)]
    db_path = tmp_path / "papers.db"
    build_db(papers, _positions(papers), db_path)

    con = sqlite3.connect(db_path)
    # Table survived (parameter binding, not string interpolation) ...
    count = con.execute("SELECT count(*) FROM papers").fetchone()[0]
    # ... and the payload is stored verbatim as data.
    title = con.execute("SELECT title FROM papers WHERE uid = ?", ("arxiv:x",)).fetchone()[0]
    con.close()

    assert count == 1
    assert title == evil


def test_positions_binary_roundtrips_in_paper_order() -> None:
    papers = [_paper(str(i), day=1 + i) for i in range(4)]
    pos = _positions(papers)
    blob = build_positions(papers, pos)

    assert len(blob) == 12 * len(papers)  # 3 float32 per point
    unpacked = struct.unpack(f"<{3 * len(papers)}f", blob)
    expected = tuple(c for p in papers for c in pos[p.uid])
    assert unpacked == expected  # point i <-> papers[i] <-> papers.idx = i


def test_positions_binary_is_deterministic() -> None:
    papers = [_paper(str(i), day=1 + i) for i in range(4)]
    pos = _positions(papers)
    assert build_positions(papers, pos) == build_positions(papers, pos)


def test_missing_position_fails_loudly() -> None:
    papers = [_paper("a")]
    with pytest.raises(ValueError, match="missing layout position"):
        build_positions(papers, {})
