"""Behaviour tests for the unified Paper model.

Only the ``uid`` derivation carries project logic worth pinning: it is the
cross-source identifier used as the dedup/join key throughout the pipeline,
and it must stay ``{source}:{source-native id}`` (the arXiv id or the DOI),
never silently switch to a different field. Pydantic's own guarantees
(frozen, extra-forbid, type coercion, defaults) are not re-tested here.
"""

import datetime

import pytest

from paperverse.models import Paper, Source


@pytest.mark.parametrize(
    ("source", "identifier", "expected_uid"),
    [
        (Source.ARXIV, "2406.09418", "arxiv:2406.09418"),
        (Source.BIORXIV, "10.1101/2024.01.15.1234", "biorxiv:10.1101/2024.01.15.1234"),
        (Source.MEDRXIV, "10.1101/2024.02.20.9999", "medrxiv:10.1101/2024.02.20.9999"),
    ],
)
def test_uid_is_source_prefixed_native_id(
    source: Source, identifier: str, expected_uid: str
) -> None:
    paper = Paper(
        source=source,
        id=identifier,
        title="t",
        categories=["x"],
        published=datetime.date(2024, 1, 1),
        version=1,
    )
    assert paper.uid == expected_uid
