# Paperverse — 3D multi-source paper cloud

.SILENT:
.ONESHELL:
.DEFAULT_GOAL := help
.PHONY: setup lint test validate help

setup:  ## Install dependencies (uv sync)
	uv sync

lint:  ## Lint with ruff
	uv run ruff check .

test:  ## Run the test suite (pytest)
	uv run pytest

validate: lint test  ## Lint + test (matches the CI gate)

help:  ## Show available recipes
	echo "Usage: make [recipe]"
	echo ""
	awk '/^# MARK:/ { \
		printf "\n\033[1;33m%s\033[0m\n", substr($$0, index($$0, ":")+2) \
	} \
	/^[a-zA-Z0-9_-]+:.*?##/ { \
		helpMessage = match($$0, /## (.*)/) ; \
		if (helpMessage) { \
			recipe = $$1 ; \
			sub(/:/, "", recipe) ; \
			printf "  \033[36m%-24s\033[0m %s\n", recipe, substr($$0, RSTART + 3, RLENGTH) \
		} \
	}' $(MAKEFILE_LIST)
