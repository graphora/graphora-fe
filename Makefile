.PHONY: lint prettier-check test build pre-commit

lint:
	cd app && npm exec eslint . --max-warnings=0 --no-cache

prettier-check:
	cd app && npm exec prettier --check "src/**/*.{ts,tsx,js,jsx,json,css,md}"

test:
	npm run test

build:
	npm run build

pre-commit:
# 	$(MAKE) lint
# 	$(MAKE) prettier-check
	$(MAKE) test
	$(MAKE) build
