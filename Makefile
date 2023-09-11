install:
	npm ci

lint:
	npx eslint .

test:
	npm test

develop:
	npx webpack serve

run build:
	NODE_ENV=production npx webpack

.PHONY: test