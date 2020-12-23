PROJECT_NAME := awsguard
SUB_PROJECTS := src
include build/common.mk

.PHONY: ensure
ensure::
	# Golang dependencies for the integration tests.
	cd ./integration-tests && go mod download && go mod tidy

.PHONY: test_all
test_all::
	cd ./integration-tests && go test . -v -timeout 30m

.PHONY: publish
publish:
	./scripts/publish.sh

# The travis_* targets are entrypoints for CI.
.PHONY: travis_cron travis_push travis_pull_request travis_api
travis_cron: all
travis_push: only_build only_test publish
travis_pull_request: all
travis_api: all
