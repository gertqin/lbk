all: client/node_modules lambdas/node_modules


client/node_modules: client/package.json client/package-lock.json
	cd client; npm install
	touch client/node_modules

lambdas/node_modules: lambdas/package.json lambdas/package-lock.json
	cd lambdas; npm install
	touch lambdas/node_modules

build_lambda = cd lambdas; npx esbuild $(1)/src/index.js --bundle "--external:*.png" "--external:@sparticuz/chrome-aws-lambda" --platform=node --target=node16 --outfile=$(1)/dist/index.js
deploy_lambda = aws lambda update-function-code --profile gqh --function-name $(1) --zip-file fileb://lambdas/$(2)/dist/lambda.zip


build-get-rankings: lambdas/node_modules
	$(call build_lambda,get_rankings)

deploy-get-rankings: build-get-rankings
	cd lambdas/get_rankings/dist; zip lambda.zip index.js
	$(call deploy_lambda,lbk-get-rankings,get_rankings)

test-get-rankings: build-get-rankings
	node lambdas/get_rankings/test.js


build-scrape-rankings: lambdas/node_modules
	$(call build_lambda,scrape_rankings)

deploy-scrape-rankings: build-scrape-rankings
	cd lambdas/scrape_rankings/dist; zip lambda.zip index.js
	$(call deploy_lambda,lbk-scrape-rankings,scrape_rankings)

test-scrape-rankings: build-scrape-rankings
	node lambdas/scrape_rankings/test.js


build-scrape-team-matches: lambdas/node_modules
	$(call build_lambda,scrape_team_matches)

deploy-scrape-team-matches: build-scrape-rankings
	cd lambdas/scrape_team_matches/dist; zip lambda.zip index.js
	$(call deploy_lambda,lbk-scrape-team-matches,scrape_team_matches)

test-scrape-team-matches: build-scrape-team-matches
	node lambdas/scrape_team_matches/test.js


run: client/node_modules
	cd client; npx vite

build-client: client/node_modules
	cd client; npx vite build

deploy-client: build-client
	cd client/dist; zip -r client.zip *
	cd client/dist; aws s3 cp --profile gqh client.zip s3://gqh-lbk-public
	aws amplify start-deployment --profile gqh --app-id d2sbnizxukiny1 --source-url s3://gqh-lbk-public/client.zip --branch-name prod
