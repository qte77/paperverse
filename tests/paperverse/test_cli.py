"""Behaviour tests for the paperverse pipeline CLI.

Pins the wiring that is ours: end-to-end ingest -> filter -> layout -> export
to papers.db + positions.bin, the --sources source filter, --seed plumbing
through to a deterministic layout, and the non-zero exit code on failure.
Argument parsing itself is pydantic-settings' concern and is not re-tested.
"""

import sqlite3
from pathlib import Path

from paperverse.__main__ import main

HEADER = "Date,ISOWeek,DOI,Version,Category,Title,Authors,Abstract"


def _server_csv(data_root: Path, server: str, name: str, *rows: str) -> None:
    week_dir = data_root / server / "2024"
    week_dir.mkdir(parents=True, exist_ok=True)
    (week_dir / name).write_text("\n".join([HEADER, *rows]) + "\n", encoding="utf-8")


def _uids(db_path: Path) -> list[str]:
    con = sqlite3.connect(db_path)
    try:
        return [row[0] for row in con.execute("SELECT uid FROM papers ORDER BY idx")]
    finally:
        con.close()


def test_runs_end_to_end_to_output_dir(tmp_path: Path) -> None:
    data, out = tmp_path / "data", tmp_path / "out"
    _server_csv(
        data,
        "arxiv",
        "1.csv",
        "2024-06-12,24,2406.1,1,cs.LG,Alpha,,",
        "2024-06-14,24,2406.2,1,cs.AI,Beta,,",
        "2024-06-13,24,2406.3,1,stat.ML,Gamma,,",
    )
    code = main(["--data-dir", str(data), "--output", str(out)])
    assert code == 0
    # Artifacts land under --output, in published-date order, sized for 3 points.
    assert _uids(out / "papers.db") == ["arxiv:2406.1", "arxiv:2406.3", "arxiv:2406.2"]
    assert (out / "positions.bin").stat().st_size == 12 * 3


def test_sources_flag_filters_by_source(tmp_path: Path) -> None:
    data, out = tmp_path / "data", tmp_path / "out"
    _server_csv(
        data,
        "arxiv",
        "1.csv",
        "2024-06-11,24,2406.1,1,cs.LG,A,,",
        "2024-06-12,24,2406.2,1,cs.AI,B,,",
        "2024-06-13,24,2406.3,1,stat.ML,C,,",
    )
    _server_csv(
        data,
        "biorxiv",
        "1.csv",
        "2024-06-14,24,10.1/x,1,neuro,X,,",
        "2024-06-15,24,10.1/y,1,neuro,Y,,",
        "2024-06-16,24,10.1/z,1,neuro,Z,,",
    )
    code = main(["--data-dir", str(data), "--output", str(out), "--sources", "arxiv"])
    assert code == 0
    uids = _uids(out / "papers.db")
    assert uids == ["arxiv:2406.1", "arxiv:2406.2", "arxiv:2406.3"]
    assert not any(uid.startswith("biorxiv:") for uid in uids)


def test_seed_produces_deterministic_output(tmp_path: Path) -> None:
    data = tmp_path / "data"
    _server_csv(
        data,
        "arxiv",
        "1.csv",
        "2024-06-12,24,2406.1,1,cs.LG,A,,",
        "2024-06-13,24,2406.2,1,cs.AI,B,,",
        "2024-06-14,24,2406.3,1,stat.ML,C,,",
    )
    out1, out2 = tmp_path / "o1", tmp_path / "o2"
    assert main(["--data-dir", str(data), "--output", str(out1), "--seed", "5"]) == 0
    assert main(["--data-dir", str(data), "--output", str(out2), "--seed", "5"]) == 0
    assert (out1 / "positions.bin").read_bytes() == (out2 / "positions.bin").read_bytes()


def test_missing_data_dir_exits_nonzero(tmp_path: Path) -> None:
    code = main(["--data-dir", str(tmp_path / "nope"), "--output", str(tmp_path / "out")])
    assert code != 0
    assert not (tmp_path / "out" / "papers.db").exists()
