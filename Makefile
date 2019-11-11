PROJECT_NAME := Pulumi AWS Guard Policy Pack
PROJECT      := github.com/pulumi/pulumi-awsguard

# Macro for printing the current step name.
STEP_MESSAGE = @echo -e "\033[0;32m$(shell echo '$(PROJECT_NAME): $@' | tr a-z A-Z | tr '_' ' ')\033[0m"

.PHONY: ensure
ensure::
	$(call STEP_MESSAGE)
	yarn install

	# Golang dependencies for the integration tests.
	go get -t -d ./integration-tests

.PHONY: lint
lint::
	$(call STEP_MESSAGE)
	yarn lint

.PHONY: build
build::
	$(call STEP_MESSAGE)
	yarn build

.PHONY: test_fast
test_fast::
	$(call STEP_MESSAGE)
	npm run test

.PHONY: test_all
test_all::
	$(MAKE) test_fast
	$(call STEP_MESSAGE)
	go test ./integration-tests/ -v -timeout 30m

# The travis_* targets are entrypoints for CI.
.PHONY: travis_cron travis_push travis_pull_request travis_api
travis_cron: all
travis_push: lint build test_all
travis_pull_request: lint build test_all
travis_api: all
