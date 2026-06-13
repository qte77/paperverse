"""Compute 3D layout positions for papers (UMAP x/y, date-derived z)."""

from __future__ import annotations

from typing import TYPE_CHECKING

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

    x and y come from a UMAP 2-D reduction of the multi-label category
    vectors (fixed ``seed`` -> reproducible); z is the normalized publication
    date (chronological depth).

    Args:
        papers: Papers to lay out.
        seed: UMAP random seed for reproducible x/y.

    Returns:
        Mapping of uid -> (x, y, z).
    """
    if not papers:
        return {}
    import umap

    vectors = encode_categories(papers, category_vocab(papers))
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
