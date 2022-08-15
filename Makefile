
all: node_modules

node_modules: package.json package-lock.json
	npm install
	touch node_modules

build_lambda = npx esbuild ./lambdas/$(1)/src/index.js --bundle "--external:*.png" "--external:@sparticuz/chrome-aws-lambda" --platform=node --target=node16 --outfile=lambdas/$(1)/dist/index.js
deploy_lambda = aws lambda update-function-code --profile gqh --function-name $(1) --zip-file fileb://lambdas/$(2)/dist/lambda.zip

build-get-rankings:
	$(call build_lambda,get_rankings)

deploy-get-rankings: build-get-rankings
	cd lambdas/get_rankings/dist; zip lambda.zip index.js
	$(call deploy_lambda,lbk-get-rankings,get_rankings)

test-get-rankings: build-get-rankings
	node lambdas/get_rankings/test.js

build-scrape-rankings:
	$(call build_lambda,scrape_rankings)

deploy-scrape-rankings: build-scrape-rankings
	cd lambdas/scrape_rankings/dist; zip lambda.zip index.js
	$(call deploy_lambda,lbk-scrape-rankings,scrape_rankings)

test-scrape-rankings: build-scrape-rankings
	node lambdas/scrape_rankings/test.js
