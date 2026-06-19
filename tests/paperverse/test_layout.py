"""Behaviour tests for the UMAP layout engine.

The value-add logic is ours: the category vocabulary, the multi-label
one-hot encoding, the date->z normalization (chronological depth), and the
determinism of the whole pipeline under a fixed seed. UMAP's clustering
quality is the library's concern, not re-tested here.
"""

import datetime

import numpy as np

from paperverse.layout import (
    category_vocab,
    date_axis,
    encode_categories,
    encode_features,
    encode_tfidf,
    l2_normalize_rows,
    layout,
)
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


def _paper_txt(rawid: str, title: str, abstract: str, cats: list[str], day: int = 1) -> Paper:
    return Paper(
        source=Source.ARXIV,
        id=rawid,
        title=title,
        abstract=abstract,
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


def test_encode_tfidf_falls_back_when_no_tokens() -> None:
    # 1-char titles + empty abstracts: the default token pattern (2+ chars) finds
    # nothing, so fit_transform raises empty-vocabulary -> guard returns zeros, no crash.
    papers = [_paper_txt("a", "t", "", ["cs.LG"]), _paper_txt("b", "x", "", ["cs.AI"])]
    out = encode_tfidf(papers)
    assert out.shape == (2, 1)
    assert out.dtype == np.float32
    assert not out.any()


def test_l2_normalize_rows_zero_row_is_safe() -> None:
    out = l2_normalize_rows(np.array([[0.0, 0.0], [3.0, 4.0]], dtype=np.float32))
    assert not np.isnan(out).any()
    assert out[0].tolist() == [0.0, 0.0]  # zero row stays zero (no divide-by-zero NaN)
    assert abs(float(np.linalg.norm(out[1])) - 1.0) < 1e-6


def test_encode_features_text_distinguishes_same_category() -> None:
    # same title + same category, different abstract -> different rows (text counts)
    papers = [
        _paper_txt("a", "neural network training", "gradient descent methods", ["cs.LG"]),
        _paper_txt("b", "neural network training", "protein folding dynamics", ["cs.LG"]),
    ]
    feats = encode_features(papers)
    assert not np.array_equal(feats[0], feats[1])


def test_encode_features_categories_count_only_when_weighted() -> None:
    # identical text, different categories
    papers = [
        _paper_txt("a", "deep learning methods", "an optimisation study", ["cs.LG"]),
        _paper_txt("b", "deep learning methods", "an optimisation study", ["q-bio.NC"]),
    ]
    weighted = encode_features(papers, category_weight=1.0)
    assert not np.array_equal(weighted[0], weighted[1])  # categories distinguish
    unweighted = encode_features(papers, category_weight=0.0)
    assert np.array_equal(unweighted[0], unweighted[1])  # weight 0 -> only text -> identical


def test_encode_features_robust_to_empty_text() -> None:
    # no usable tokens -> tfidf block degenerate; the category block must still place
    # and distinguish the papers, with no NaN leaking into UMAP.
    papers = [_paper_txt("a", "t", "", ["cs.LG"]), _paper_txt("b", "t", "", ["q-bio.NC"])]
    feats = encode_features(papers)
    assert not np.isnan(feats).any()
    assert not np.array_equal(feats[0], feats[1])


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
    papers = [
        _paper_txt(str(i), f"study topic{i}", f"methods topic{i}", [f"cat{i}", "shared"], 1 + i)
        for i in range(12)
    ]
    first = layout(papers, seed=7)
    second = layout(papers, seed=7)
    assert set(first) == {p.uid for p in papers}  # every paper placed
    assert first == second  # deterministic under a fixed seed
    z = [float(v) for v in date_axis(papers)]
    assert [first[p.uid][2] for p in papers] == z  # z is the normalized date


def test_layout_empty() -> None:
    assert layout([]) == {}
