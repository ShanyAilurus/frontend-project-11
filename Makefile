install:
	npm ci

lint:
	npx eslint .

test:
	npm test

develop:
	npx webpack serve

build:
	NODE_ENV=production npx webpack

.PHONY: test
