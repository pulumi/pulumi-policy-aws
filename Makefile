PROJECT_NAME := awsguard
NODE_MODULE_NAME := @pulumi/awsguard
include build/common.mk

VERSION := $(shell ./scripts/get-version.sh)

.PHONY: ensure
ensure::
	yarn install --cwd ./src/

	# Golang dependencies for the integration tests.
	go get -t -d ./integration-tests

.PHONY: build
build::
	# Clean
	rm -rf bin/

	# Build
	tsc --project ./src --outDir ./bin/

	# Set version and copy non-source assets.
	sed -e 's/\$${VERSION}/$(VERSION)/g' < ./src/package.json > bin/package.json
	cp README.md LICENSE ./bin/
	node ./scripts/reversion.js bin/version.js ${VERSION}

.PHONY: lint
lint::
	tslint -c ./src/tslint.json -p ./src/tsconfig.json

test_fast::
	cd src && mocha --require ./node_modules/ts-node/register tests/**/*.spec.ts

.PHONY: test_all
test_all::
	$(MAKE) test_fast
	go test ./integration-tests/ -v -timeout 30m

.PHONY: publish
publish:
	./scripts/publish.sh

# The travis_* targets are entrypoints for CI.
.PHONY: travis_cron travis_push travis_pull_request travis_api
travis_cron: all
travis_push: lint build test_all publish_packages
travis_pull_request: lint build test_all
travis_api: all
