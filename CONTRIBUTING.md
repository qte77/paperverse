# Contributing

## Principles

- **KISS** — Simplest solution that works
- **DRY** — Single source of truth
- **YAGNI** — Only implement what's requested
- **TDD** — Red-Green-Refactor, test behavior not implementation

## Testing

```bash
make test           # Run all tests
make validate       # Full pre-commit validation
```

- pytest for logic, Hypothesis for properties, inline-snapshot for structure
- No BDD, no Gherkin, no feature files
- Tests assert observable behavior (inputs → outputs/side-effects)

## Commits

Use conventional commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`
