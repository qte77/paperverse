"""Behaviour tests for multi-source ingestion.

Pins the ingest logic: source inference from directory names, combining
multiple source directories, de-duplication to one Paper per uid (highest
version wins), and date ordering. csv parsing itself is covered by the
loader tests.
"""

import datetime
from pathlib import Path

from paperverse.ingest import ingest, source_from_dir
from paperverse.models import Source

HEADER = "Date,ISOWeek,DOI,Version,Category,Title,Authors,Abstract"


def _server_csv(data_root: Path, server: str, name: str, *rows: str) -> None:
    week_dir = data_root / server / "2024"
    week_dir.mkdir(parents=True, exist_ok=True)
    (week_dir / name).write_text("\n".join([HEADER, *rows]) + "\n", encoding="utf-8")


def test_source_from_dir_maps_known_and_rejects_unknown() -> None:
    assert source_from_dir("biorxiv") is Source.BIORXIV
    assert source_from_dir("chemrxiv") is None


def test_ingest_combines_sources_sorted_by_date(tmp_path: Path) -> None:
    _server_csv(tmp_path, "arxiv", "1.csv", "2024-06-14,24,2406.1,1,cs.LG,A,,")
    _server_csv(tmp_path, "biorxiv", "1.csv", "2024-06-12,24,10.1/x,1,neuro,B,,")
    assert [p.uid for p in ingest(tmp_path)] == ["biorxiv:10.1/x", "arxiv:2406.1"]


def test_ingest_keeps_highest_version_per_uid(tmp_path: Path) -> None:
    _server_csv(
        tmp_path,
        "arxiv",
        "1.csv",
        "2024-06-12,24,2406.1,1,cs.LG,old,,",
        "2024-06-14,24,2406.1,3,cs.LG,new,,",
        "2024-06-13,24,2406.1,2,cs.LG,mid,,",
    )
    [paper] = ingest(tmp_path)
    assert paper.version == 3
    assert paper.title == "new"


def test_ingest_skips_unknown_dirs_and_empty_root(tmp_path: Path) -> None:
    (tmp_path / "junk").mkdir()
    assert ingest(tmp_path) == []


def test_ingest_result_is_date_sorted(tmp_path: Path) -> None:
    _server_csv(
        tmp_path,
        "medrxiv",
        "1.csv",
        "2024-03-03,9,10.1/c,1,x,C,,",
        "2024-01-01,1,10.1/a,1,x,A,,",
    )
    assert [p.published for p in ingest(tmp_path)] == [
        datetime.date(2024, 1, 1),
        datetime.date(2024, 3, 3),
    ]
