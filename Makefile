
all: node_modules

node_modules: package.json package-lock.json
	npm install
	touch node_modules

build-get-rankings: lambdas/get_rankings/src
	npx esbuild ./lambdas/get_rankings/src/index.js --bundle --platform=node --target=node16 --outfile=lambdas/get_rankings/dist/index.js

test-get-rankings:
	node lambdas/get_rankings/test.js
