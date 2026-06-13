"""Behaviour tests for the canonical CSV loader.

These pin loader logic, not csv/pydantic internals: the multi-category
split, de-duplication by (uid, version), the per-source id/doi mapping
(an arXiv id is not a DOI), field mapping from the canonical columns, and
the published-date ordering of the result.
"""

import datetime
from pathlib import Path

from paperverse.adapters.csv_loader import load_csv
from paperverse.models import Source

CANONICAL_HEADER = "Date,ISOWeek,DOI,Version,Category,Title,Authors,Abstract"


def _write(tmp_path: Path, *rows: str) -> Path:
    path = tmp_path / "week.csv"
    path.write_text("\n".join([CANONICAL_HEADER, *rows]) + "\n", encoding="utf-8")
    return path


def test_splits_semicolon_categories(tmp_path: Path) -> None:
    path = _write(tmp_path, "2024-06-13,24,2406.09418,1,cs.LG; cs.AI,Title,Doe J,Abs")
    [paper] = load_csv(path, Source.ARXIV)
    assert paper.categories == ["cs.LG", "cs.AI"]


def test_dedupes_by_uid_and_version(tmp_path: Path) -> None:
    path = _write(
        tmp_path,
        "2024-06-13,24,2406.09418,1,cs.LG,Title,Doe J,Abs",
        "2024-06-13,24,2406.09418,1,cs.LG,Title,Doe J,Abs",
        "2024-06-14,24,2406.09418,2,cs.LG,Title v2,Doe J,Abs",
    )
    papers = load_csv(path, Source.ARXIV)
    assert {(p.uid, p.version) for p in papers} == {
        ("arxiv:2406.09418", 1),
        ("arxiv:2406.09418", 2),
    }


def test_arxiv_id_is_distinct_from_doi(tmp_path: Path) -> None:
    path = _write(tmp_path, "2024-06-13,24,2406.09418,1,cs.LG,T,A,Abs")
    [arxiv] = load_csv(path, Source.ARXIV)
    assert arxiv.id == "2406.09418"
    assert arxiv.doi is None


def test_biorxiv_doi_equals_id(tmp_path: Path) -> None:
    path = _write(tmp_path, "2024-01-15,3,10.1101/2024.01.15.1234,2,neuroscience,T,A,Abs")
    [bio] = load_csv(path, Source.BIORXIV)
    assert bio.id == "10.1101/2024.01.15.1234"
    assert bio.doi == "10.1101/2024.01.15.1234"


def test_result_is_sorted_by_published(tmp_path: Path) -> None:
    path = _write(
        tmp_path,
        "2024-06-14,24,b,1,x,T,A,Abs",
        "2024-06-12,24,a,1,x,T,A,Abs",
        "2024-06-13,24,c,1,x,T,A,Abs",
    )
    papers = load_csv(path, Source.ARXIV)
    assert [p.published for p in papers] == [
        datetime.date(2024, 6, 12),
        datetime.date(2024, 6, 13),
        datetime.date(2024, 6, 14),
    ]


def test_maps_canonical_fields(tmp_path: Path) -> None:
    path = _write(
        tmp_path,
        "2024-01-15,3,10.1101/x,2,neuroscience,Cool Title,Smith J; Jones A,An abstract",
    )
    [p] = load_csv(path, Source.MEDRXIV)
    assert p.published == datetime.date(2024, 1, 15)
    assert p.version == 2
    assert p.title == "Cool Title"
    assert p.authors == "Smith J; Jones A"
    assert p.abstract == "An abstract"
    assert p.uid == "medrxiv:10.1101/x"
