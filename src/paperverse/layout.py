"""Compute 3D layout positions for papers (UMAP x/y, date-derived z)."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, cast

import numpy as np

if TYPE_CHECKING:
    from collections.abc import Sequence

    from paperverse.models import Paper

Position = tuple[float, float, float]


def category_vocab(papers: Sequence[Paper]) -> list[str]:
    """Return the sorted, unique set of categories across all papers."""
    return sorted({category for paper in papers for category in paper.categories})


def encode_categories(papers: Sequence[Paper], vocab: list[str]) -> np.ndarray:
    """Build the multi-label one-hot matrix (n_papers x len(vocab))."""
    index = {category: i for i, category in enumerate(vocab)}
    matrix = np.zeros((len(papers), len(vocab)), dtype=np.float32)
    for row, paper in enumerate(papers):
        for category in paper.categories:
            matrix[row, index[category]] = 1.0
    return matrix


def encode_tfidf(papers: Sequence[Paper], *, max_features: int = 5000) -> np.ndarray:
    """Encode each paper's title + abstract as a TF-IDF row vector (dense float32).

    Deterministic. The default token pattern needs 2+ char tokens, so degenerate
    corpora raise an empty-vocabulary error, which is caught and returned as a zero
    ``(n, 1)`` matrix so the pipeline never crashes.
    """
    # Lazy import: sklearn (+ its scipy stack) is a multi-second import, so keep it off
    # the import path of callers that never lay out (models/db/ingest, CLI ``--help``).
    from sklearn.feature_extraction.text import TfidfVectorizer

    corpus = [f"{paper.title} {paper.abstract}" for paper in papers]
    min_df = 1 if len(papers) < 50 else 2
    vectorizer = TfidfVectorizer(max_features=max_features, min_df=min_df, sublinear_tf=True)
    # sklearn's fit_transform is typed as a broad union; cast at that boundary (the
    # project already relaxes the untyped-library reports) and densify to float32.
    try:
        rows = cast("Any", vectorizer.fit_transform(corpus)).toarray()
    except ValueError:
        return np.zeros((len(papers), 1), dtype=np.float32)
    return np.asarray(rows, dtype=np.float32)


def l2_normalize_rows(matrix: np.ndarray) -> np.ndarray:
    """Scale each row to unit L2 norm; all-zero rows stay zero (no divide-by-zero)."""
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    return np.divide(matrix, norms, out=np.zeros_like(matrix), where=norms > 0)


def encode_features(
    papers: Sequence[Paper], *, max_features: int = 5000, category_weight: float = 1.0
) -> np.ndarray:
    """Hybrid UMAP input: TF-IDF(title+abstract) plus weighted, L2-normalized categories."""
    tfidf = encode_tfidf(papers, max_features=max_features)
    cats = l2_normalize_rows(encode_categories(papers, category_vocab(papers))) * category_weight
    return np.hstack([tfidf, cats]).astype(np.float32)


def date_axis(papers: Sequence[Paper]) -> np.ndarray:
    """Normalize publication dates to z in [0, 1] for chronological depth."""
    ordinals = np.array([paper.published.toordinal() for paper in papers], dtype=np.float64)
    if not len(ordinals):
        return ordinals
    span = float(ordinals.max() - ordinals.min())
    if span == 0.0:
        return np.zeros(len(papers), dtype=np.float64)
    return (ordinals - ordinals.min()) / span


def layout(papers: Sequence[Paper], seed: int = 42) -> dict[str, Position]:
    """Compute a deterministic 3D position per paper, keyed by uid.

    x and y come from a UMAP 2-D reduction of the hybrid feature vectors
    (TF-IDF on title+abstract, hstacked with weighted categories; fixed
    ``seed`` -> reproducible), so papers placed near each other are topically
    similar; z is the normalized publication date (chronological depth).

    Args:
        papers: Papers to lay out.
        seed: UMAP random seed for reproducible x/y.

    Returns:
        Mapping of uid -> (x, y, z).
    """
    if not papers:
        return {}
    # Lazy import: umap pulls in numba, whose first import is slow to JIT-warm; defer it
    # so importing this module (e.g. for Position/date_axis) doesn't pay that cost.
    import umap

    vectors = encode_features(papers)
    z = date_axis(papers)
    n_neighbors = min(15, len(papers) - 1)
    # init="random" (seeded) instead of the default spectral init, whose
    # eigensolver start vector is not controlled by random_state -> required
    # for reproducible builds (same data + seed -> identical layout).
    reducer = umap.UMAP(
        n_components=2, n_neighbors=n_neighbors, random_state=seed, init="random"
    )
    coords = np.asarray(reducer.fit_transform(vectors), dtype=np.float64).tolist()
    return {
        paper.uid: (float(coords[i][0]), float(coords[i][1]), float(z[i]))
        for i, paper in enumerate(papers)
    }
