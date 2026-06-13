"""Behaviour tests for the UMAP layout engine.

The value-add logic is ours: the category vocabulary, the multi-label
one-hot encoding, the date->z normalization (chronological depth), and the
determinism of the whole pipeline under a fixed seed. UMAP's clustering
quality is the library's concern, not re-tested here.
"""

import datetime

from paperverse.layout import category_vocab, date_axis, encode_categories, layout
from paperverse.models import Paper, Source


def _paper(rawid: str, cats: list[str], day: int) -> Paper:
    return Paper(
        source=Source.ARXIV,
        id=rawid,
        title="t",
        categories=cats,
        published=datetime.date(2024, 1, day),
        version=1,
    )


def test_category_vocab_is_sorted_and_unique() -> None:
    papers = [_paper("a", ["cs.LG", "cs.AI"], 1), _paper("b", ["cs.AI", "stat.ML"], 2)]
    assert category_vocab(papers) == ["cs.AI", "cs.LG", "stat.ML"]


def test_encode_categories_is_multi_label_one_hot() -> None:
    papers = [_paper("a", ["cs.AI"], 1), _paper("b", ["cs.AI", "stat.ML"], 2)]
    vocab = category_vocab(papers)  # ["cs.AI", "stat.ML"]
    assert encode_categories(papers, vocab).tolist() == [[1.0, 0.0], [1.0, 1.0]]


def test_date_axis_normalized_and_monotonic() -> None:
    papers = [_paper("a", ["x"], 1), _paper("b", ["x"], 11), _paper("c", ["x"], 21)]
    z = [float(v) for v in date_axis(papers)]
    assert z[0] == 0.0
    assert z[2] == 1.0
    assert z[0] < z[1] < z[2]


def test_date_axis_handles_single_date() -> None:
    papers = [_paper("a", ["x"], 5), _paper("b", ["y"], 5)]
    assert [float(v) for v in date_axis(papers)] == [0.0, 0.0]


def test_layout_is_deterministic_complete_and_date_keyed() -> None:
    papers = [_paper(str(i), [f"cat{i}", "shared"], 1 + i) for i in range(12)]
    first = layout(papers, seed=7)
    second = layout(papers, seed=7)
    assert set(first) == {p.uid for p in papers}  # every paper placed
    assert first == second  # deterministic under a fixed seed
    z = [float(v) for v in date_axis(papers)]
    assert [first[p.uid][2] for p in papers] == z  # z is the normalized date


def test_layout_empty() -> None:
    assert layout([]) == {}
