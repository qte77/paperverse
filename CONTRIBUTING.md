# Contributing

`CONTRIBUTING.md` is the **source of truth for how to work in this project** — for
humans and agents alike. Principles, working rules, testing, and the git/PR
workflow all live here; other docs (e.g. [`AGENTS.md`](AGENTS.md)) point here
rather than restating them.

## Principles

- **KISS** — Simplest solution that works
- **DRY** — Single source of truth; reference, don't duplicate
- **AHA** — Avoid Hasty Abstractions; prefer duplication over the wrong abstraction
- **YAGNI** — Only implement what's requested; no speculative features
- **TDD** — Red-Green-Refactor; test behaviour, not implementation

## Working rules

- **Verify before you use** — only use libraries/APIs that exist (check the
  manifests, docs, or source); never invent or assume one.
- **Resolve ambiguity** — when requirements or context are unclear, ask or
  research; don't guess.
- **Reuse before adding** — prefer existing patterns, utilities, and brand tokens;
  match complexity to the task.
- **Validate before done** — run `make validate` (and `make test_js` for `ui/`) and
  report the result; never claim completion on a red gate.

## Testing

```bash
make test       # fast pytest (red-green-refactor loop)
make validate   # full gate: ruff + pyright (strict) + markdownlint + pip-audit + pytest (cov >= 90%)
make test_js    # ui/ vitest (make typecheck_js for tsc)
```

- Write tests **first** (Red → Green → Refactor).
- **Only clear, value-adding tests.** Cover real behaviour and **edge cases** —
  boundaries, empty/zero, malformed input, ordering, determinism, error paths.
- **Never write trivial tests** — asserting a constant, that a constructor ran,
  getters/setters, or anything that just restates the implementation. If a test
  can't fail for a real reason, delete it.
- Tests assert observable behaviour (inputs → outputs/side-effects), not internals.
- Browser/GPU glue a unit test can't meaningfully exercise is verified by type
  checks and a build smoke — not by mock-only tests.
- pytest for logic, Hypothesis for properties, inline-snapshot for structure. No
  BDD, no Gherkin, no feature files.

## Running the UI locally

```bash
make serve_ui            # build ui/ + serve the production bundle on :8143 (node-free: uv + http.server)
make serve_ui PORT=9000  # override the port
npm --prefix ui run dev  # hot-reload dev server (source, not the production bundle)
```

`serve_ui` regenerates the data, builds `ui/` with a root base path, and serves
`ui/dist` the way GitHub Pages does — assets resolve at the server root.

## Commits

Conventional commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`.
Commit by topic — one logical change per commit. Commit with `--no-gpg-sign`.

## Branches & PRs

- Branch off `main`; never commit directly to `main`.
- Open a PR; keep its commits topic-scoped.
- **Merge only when every CI check is green**, via
  `gh pr merge --squash --admin --delete-branch`.
- Never `paths-ignore` a required check — CodeQL and CodeFactor run on every PR, so
  a skipped required check blocks the merge even with `--admin`.
- In this dev container, prefix `git`/`gh` with `env -u GH_TOKEN -u GITHUB_TOKEN`
  when a stale token shadows your `gh auth` credentials.

## Decisions

Record architectural decisions as ADRs under
[`docs/decisions/`](docs/decisions/) (MADR format) for any non-obvious or
hard-to-reverse choice.
