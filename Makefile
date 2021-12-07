PROJECT_NAME := awsguard
SUB_PROJECTS := src
include build/common.mk

.PHONY: ensure
ensure::
	# Golang dependencies for the integration tests.
	cd ./integration-tests && go mod download

.PHONY: test_all
test_all::
	cd ./integration-tests && go test . -v -timeout 30m

.PHONY: publish
publish:
	./scripts/publish.sh
