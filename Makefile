.DEFAULT_GOAL := help
NPM ?= npm

.PHONY: help install dev lint format typecheck test golden golden-update check build preview e2e clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies exactly as locked
	$(NPM) ci

dev: ## Run the Vite dev server with hot reload
	$(NPM) run dev

lint: ## Lint with ESLint, including the sim-purity rules
	$(NPM) run lint

format: ## Format all files with Prettier
	$(NPM) run format

typecheck: ## Type-check the app, then the sim without DOM types
	$(NPM) run typecheck

test: ## Run unit and property tests
	$(NPM) run test

golden: ## Run golden pitch-log regression tests
	$(NPM) run golden

golden-update: ## Regenerate golden pitch logs after an intended sim change
	$(NPM) run golden:update

check: lint typecheck test golden ## Lint, typecheck, unit, and golden tests

build: ## Production build into dist/
	$(NPM) run build

preview: build ## Serve the production build at http://127.0.0.1:4173/
	$(NPM) run preview

e2e: build ## Headless browser tests against the production build
	$(NPM) run e2e

clean: ## Remove build and test output
	rm -rf dist test-results playwright-report
