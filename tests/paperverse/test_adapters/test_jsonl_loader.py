"""Behaviour tests for the curated JSONL loader.

Pins loader logic, not json/pydantic internals: field mapping from the paper-eval
record, the per-source id/doi mapping (an arXiv id is not a DOI), the category split,
de-duplication by (uid, version), published-date ordering, blank-line tolerance, and
loud failure on malformed input.
"""

import datetime
import json
from pathlib import Path

import pytest

from paperverse.adapters.jsonl_loader import load_jsonl
from paperverse.models import Source


def _rec(
    *,
    doi: str = "2606.14620",
    version: str = "1",
    date: str = "2026-06-12",
    category: str = "cs.LG",
    title: str = "A Title",
    authors: str = "",
    abstract: str = "An abstract",
    summary: str = "s",
    subjects: list[str] | None = None,
    key_findings: list[str] | None = None,
) -> dict[str, object]:
    return {
        "date": date,
        "iso_week": "24",
        "doi": doi,
        "version": version,
        "category": category,
        "title": title,
        "authors": authors,
        "abstract": abstract,
        "extracted": {
            "summary": summary,
            "subjects": subjects if subjects is not None else [],
            "methods": ["m"],
            "key_findings": key_findings if key_findings is not None else ["k"],
        },
    }


def _write(tmp_path: Path, *records: dict[str, object]) -> Path:
    path = tmp_path / "arxiv-2026-W24.jsonl"
    path.write_text("\n".join(json.dumps(r) for r in records) + "\n", encoding="utf-8")
    return path


def test_maps_record_fields(tmp_path: Path) -> None:
    path = _write(tmp_path, _rec(title="Cool Title", abstract="An abstract", authors="Doe J"))
    [p] = load_jsonl(path, Source.ARXIV)
    assert p.published == datetime.date(2026, 6, 12)
    assert p.version == 1
    assert p.title == "Cool Title"
    assert p.authors == "Doe J"
    assert p.abstract == "An abstract"
    assert p.uid == "arxiv:2606.14620"


def test_arxiv_id_is_distinct_from_doi(tmp_path: Path) -> None:
    path = _write(tmp_path, _rec(doi="2606.14620"))
    [p] = load_jsonl(path, Source.ARXIV)
    assert p.id == "2606.14620"
    assert p.doi is None


def test_non_arxiv_doi_equals_id(tmp_path: Path) -> None:
    path = _write(tmp_path, _rec(doi="10.1101/2026.01.02.3", category="neuroscience"))
    [p] = load_jsonl(path, Source.BIORXIV)
    assert p.id == "10.1101/2026.01.02.3"
    assert p.doi == "10.1101/2026.01.02.3"


def test_splits_semicolon_categories(tmp_path: Path) -> None:
    path = _write(tmp_path, _rec(category="cs.LG; cs.AI"))
    [p] = load_jsonl(path, Source.ARXIV)
    assert p.categories == ["cs.LG", "cs.AI"]


def test_missing_authors_defaults_to_empty(tmp_path: Path) -> None:
    record = _rec()
    del record["authors"]
    path = _write(tmp_path, record)
    [p] = load_jsonl(path, Source.ARXIV)
    assert p.authors == ""


def test_dedupes_by_uid_and_version(tmp_path: Path) -> None:
    path = _write(
        tmp_path,
        _rec(doi="2606.1", version="1"),
        _rec(doi="2606.1", version="1"),
        _rec(doi="2606.1", version="2", date="2026-06-13"),
    )
    papers = load_jsonl(path, Source.ARXIV)
    assert {(p.uid, p.version) for p in papers} == {("arxiv:2606.1", 1), ("arxiv:2606.1", 2)}


def test_result_is_sorted_by_published(tmp_path: Path) -> None:
    path = _write(
        tmp_path,
        _rec(doi="b", date="2026-06-14"),
        _rec(doi="a", date="2026-06-12"),
        _rec(doi="c", date="2026-06-13"),
    )
    papers = load_jsonl(path, Source.ARXIV)
    assert [p.published for p in papers] == [
        datetime.date(2026, 6, 12),
        datetime.date(2026, 6, 13),
        datetime.date(2026, 6, 14),
    ]


def test_blank_lines_are_skipped(tmp_path: Path) -> None:
    path = tmp_path / "arxiv-2026-W24.jsonl"
    path.write_text(json.dumps(_rec()) + "\n\n   \n", encoding="utf-8")
    assert len(load_jsonl(path, Source.ARXIV)) == 1


def test_malformed_line_raises(tmp_path: Path) -> None:
    path = tmp_path / "arxiv-2026-W24.jsonl"
    path.write_text("{not valid json}\n", encoding="utf-8")
    with pytest.raises(json.JSONDecodeError):
        load_jsonl(path, Source.ARXIV)


def test_missing_required_field_raises(tmp_path: Path) -> None:
    record = _rec()
    del record["doi"]
    path = _write(tmp_path, record)
    with pytest.raises(KeyError):
        load_jsonl(path, Source.ARXIV)


def test_empty_authors_falls_back_to_subjects(tmp_path: Path) -> None:
    path = _write(tmp_path, _rec(authors="", subjects=["Graph Nets", "Gemma 4"]))
    [p] = load_jsonl(path, Source.ARXIV)
    assert p.authors == "Graph Nets; Gemma 4"


def test_present_authors_preserved_over_subjects(tmp_path: Path) -> None:
    path = _write(tmp_path, _rec(authors="Doe J; Roe A", subjects=["Graph Nets"]))
    [p] = load_jsonl(path, Source.ARXIV)
    assert p.authors == "Doe J; Roe A"


def test_empty_authors_no_subjects_stays_empty(tmp_path: Path) -> None:
    path = _write(tmp_path, _rec(authors="", subjects=[]))
    [p] = load_jsonl(path, Source.ARXIV)
    assert p.authors == ""


def test_maps_extracted_summary_and_key_findings(tmp_path: Path) -> None:
    path = _write(
        tmp_path,
        _rec(summary="A short eval summary.", key_findings=["Finding one.", "Finding two."]),
    )
    [p] = load_jsonl(path, Source.ARXIV)
    assert p.summary == "A short eval summary."
    assert p.key_findings == ["Finding one.", "Finding two."]


def test_missing_extracted_defaults(tmp_path: Path) -> None:
    record = _rec()
    del record["extracted"]
    path = _write(tmp_path, record)
    [p] = load_jsonl(path, Source.ARXIV)
    assert p.summary == ""
    assert p.key_findings == []
