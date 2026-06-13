# Paperverse — 3D multi-source paper cloud

.SILENT:
.ONESHELL:
.PHONY: \
	setup setup_uv setup_dev setup_lychee setup_md setup_js \
	lint autofix check_types lint_md lint_links \
	test test_cov retest validate \
	typecheck_js test_js \
	clean help
.DEFAULT_GOAL := help

VERBOSE ?=
ifndef VERBOSE
  RUFF_QUIET := --quiet
  PYTEST_QUIET := -q --tb=short --no-header
  PYRIGHT_QUIET := > /dev/null
endif

# Override to pin a lychee build, e.g. LYCHEE_URL=.../lychee-v0.18.0-...tar.gz
LYCHEE_URL ?= https://github.com/lycheeverse/lychee/releases/latest/download/lychee-x86_64-unknown-linux-gnu.tar.gz
LYCHEE_BIN ?= $(HOME)/.local/bin/lychee


# MARK: SETUP


setup_uv:  ## Install uv (if missing)
	if command -v uv > /dev/null 2>&1; then
		echo "uv already installed: $$(uv --version)"
	else
		curl --proto '=https' --tlsv1.2 -LsSf https://astral.sh/uv/install.sh | sh
		echo "NOTE: restart your shell or run 'source $$HOME/.local/bin/env'"
	fi

setup_dev: setup_uv  ## uv sync (dev + test groups)
	uv sync

setup_lychee:  ## Install lychee link checker (override LYCHEE_URL / LYCHEE_BIN)
	tmp=$$(mktemp -d)
	curl -sSfL $(LYCHEE_URL) | tar xz -C "$$tmp"
	mkdir -p $(dir $(LYCHEE_BIN))
	install -m 755 "$$tmp"/lychee-*/lychee $(LYCHEE_BIN)
	rm -rf "$$tmp"
	echo "lychee version: $$($(LYCHEE_BIN) --version)"

setup_md:  ## Install markdownlint-cli2 (matches the CI linter)
	npm install -gs markdownlint-cli2
	echo "markdownlint-cli2 version: $$(markdownlint-cli2 --version)"

setup: setup_dev setup_lychee setup_md  ## Full local dev setup


# MARK: QUALITY


lint:  ## ruff check (import sort, complexity C90<=10, security S, docstrings)
	echo "--- lint"
	uv run ruff check $(RUFF_QUIET) .

autofix:  ## ruff format + ruff check --fix
	uv run ruff format $(RUFF_QUIET) . && uv run ruff check --fix $(RUFF_QUIET) .

check_types:  ## pyright type check (src)
	echo "--- check_types"
	uv run pyright src $(PYRIGHT_QUIET)

lint_md:  ## markdownlint-cli2 on all markdown
	echo "--- lint_md"
	markdownlint-cli2 "**/*.md"

lint_links:  ## lychee broken-link checker (network; respects .gitignore)
	echo "--- lint_links"
	lychee --no-progress .

test:  ## pytest
	echo "--- test"
	uv run pytest $(PYTEST_QUIET)

test_cov:  ## pytest with coverage (--cov-fail-under=0; raise as the suite grows)
	echo "--- test_cov"
	uv run pytest --cov=src/paperverse --cov-fail-under=0 $(PYTEST_QUIET)

retest:  ## rerun last failed tests only
	uv run pytest --lf -x

validate:  ## CI gate: lint + check_types + lint_md + test_cov
	set -e
	$(MAKE) -s lint
	$(MAKE) -s check_types
	$(MAKE) -s lint_md
	$(MAKE) -s test_cov


# MARK: UI


setup_js:  ## Install ui/ npm devDependencies (npm ci)
	npm --prefix ui ci

typecheck_js:  ## tsc --noEmit in ui/
	npm --prefix ui run typecheck

test_js:  ## vitest run in ui/
	npm --prefix ui test


# MARK: CLEAN


clean:  ## remove caches
	rm -rf .pytest_cache .ruff_cache .pyright_cache .coverage htmlcov
	find . -name "__pycache__" -type d -exec rm -rf {} +
	find . -name "*.pyc" -delete


# MARK: HELP


help:  ## show available recipes grouped by section
	echo "Usage: make [recipe] [VERBOSE=1]"
	echo ""
	awk '/^# MARK:/ { \
		section = substr($$0, index($$0, ":")+2); \
		printf "\n\033[1m%s\033[0m\n", section \
	} \
	/^[a-zA-Z0-9_-]+:.*?##/ { \
		helpMessage = match($$0, /## (.*)/); \
		if (helpMessage) { \
			recipe = $$1; \
			sub(/:/, "", recipe); \
			printf "  \033[36m%-14s\033[0m %s\n", recipe, substr($$0, RSTART + 3, RLENGTH) \
		} \
	}' $(MAKEFILE_LIST)
