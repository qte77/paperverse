# Paperverse — 3D multi-source paper cloud
# Ralph recipes imported from submodule

.SILENT:
.ONESHELL:
.DEFAULT_GOAL := help

# Import ralph recipes (submodule)
-include ralph/Makefile

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
