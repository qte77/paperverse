"""Shared Hypothesis strategies for the pipeline property tests.

`paper_st` draws an arbitrary valid `Paper`; `papers_st` draws a list of papers with
distinct uids (the pipeline's dedup/join key). Imported directly by the property tests
(`from conftest import ...`) — pytest puts this directory on `sys.path`.
"""

from __future__ import annotations

import datetime

from hypothesis import strategies as st
from hypothesis.strategies import DrawFn, SearchStrategy, composite

from paperverse.models import Paper, Source

# Sane bounds so date ordinals / ISO formatting stay meaningful.
_MIN_DATE = datetime.date(1990, 1, 1)
_MAX_DATE = datetime.date(2099, 12, 31)

# Source-native ids: printable, no control chars; `:` and `/` are allowed so the uid's
# id segment can itself contain the separators used across sources.
_ids = st.from_regex(r"[A-Za-z0-9./:-]{1,16}", fullmatch=True)
_text = st.text(max_size=40)
_categories = st.lists(st.text(min_size=1, max_size=8), max_size=4)


@composite
def paper_st(draw: DrawFn) -> Paper:
    """Draw an arbitrary valid `Paper`, spanning all sources."""
    return Paper(
        source=draw(st.sampled_from(list(Source))),
        id=draw(_ids),
        title=draw(_text),
        categories=draw(_categories),
        published=draw(st.dates(min_value=_MIN_DATE, max_value=_MAX_DATE)),
        version=draw(st.integers(min_value=1, max_value=20)),
        authors=draw(_text),
        abstract=draw(_text),
    )


def papers_st(*, min_size: int = 0, max_size: int = 8) -> SearchStrategy[list[Paper]]:
    """A list of papers with distinct uids (the dedup/join key across the pipeline)."""
    return st.lists(paper_st(), min_size=min_size, max_size=max_size, unique_by=lambda p: p.uid)
