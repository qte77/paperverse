"""Pipeline CLI: ingest -> layout -> export, exposed as the ``paperverse`` command."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import TYPE_CHECKING

from pydantic_settings import BaseSettings, CliApp, SettingsConfigDict

from paperverse.db import export
from paperverse.ingest import ingest
from paperverse.layout import layout
from paperverse.models import Source  # noqa: TC001  # pydantic resolves the annotation at runtime

if TYPE_CHECKING:
    from collections.abc import Sequence


class AppSettings(BaseSettings):
    """Command-line settings for the end-to-end paperverse pipeline."""

    model_config = SettingsConfigDict(cli_prog_name="paperverse", cli_kebab_case=True)

    data_dir: Path = Path("data")
    output: Path = Path("dist/data")
    sources: list[Source] | None = None
    seed: int = 42


def main(argv: Sequence[str] | None = None) -> int:
    """Run the pipeline end to end: CSV dirs -> ``papers.db`` + positions binary.

    Args:
        argv: CLI arguments; ``None`` parses ``sys.argv``.

    Returns:
        ``0`` on success, ``1`` on any pipeline error.
    """
    try:
        settings = CliApp.run(AppSettings, cli_args=list(argv) if argv is not None else None)
        papers = ingest(settings.data_dir)
        if settings.sources:
            wanted = set(settings.sources)
            papers = [paper for paper in papers if paper.source in wanted]
        positions = layout(papers, seed=settings.seed)
        db_path, positions_path = export(papers, positions, settings.output)
    except Exception as exc:  # CLI boundary: report any failure and exit non-zero
        print(f"paperverse: {exc}", file=sys.stderr)
        return 1
    print(f"wrote {db_path} ({len(papers)} papers) and {positions_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
