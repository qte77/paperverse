"""Unified paper model for arXiv, bioRxiv, and medRxiv sources."""

from __future__ import annotations

import datetime  # noqa: TC003  # pydantic resolves the annotation at runtime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, computed_field


class Source(StrEnum):
    """Preprint server a paper originates from."""

    ARXIV = "arxiv"
    BIORXIV = "biorxiv"
    MEDRXIV = "medrxiv"


class Paper(BaseModel):
    """A paper normalized from any supported source.

    ``uid`` is derived from ``source`` and the source-native ``id`` (an
    arXiv id for arXiv, the DOI for bioRxiv/medRxiv). ``id`` and ``doi``
    are kept distinct because an arXiv id is not a DOI.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    source: Source
    id: str
    title: str
    categories: list[str]
    published: datetime.date
    version: int
    authors: str = ""
    abstract: str = ""
    doi: str | None = None
    citations: int | None = None
    # Curated paper-eval enrichment (real feed only; empty for the demo CSV corpus).
    summary: str = ""
    key_findings: list[str] = Field(default_factory=list)

    @computed_field
    @property
    def uid(self) -> str:
        """Stable cross-source identifier, e.g. ``arxiv:2406.09418``."""
        return f"{self.source.value}:{self.id}"
