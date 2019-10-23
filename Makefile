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

.PHONY: test
test::
	$(call STEP_MESSAGE)
	go test ./integration-tests/ -v -timeout 30m

.PHONY: travis_push
travis_push::
	$(call STEP_MESSAGE)
	$(MAKE) lint
	$(MAKE) build
	$(MAKE) test

.PHONY: travis_pull_request
travis_pull_request::
	$(call STEP_MESSAGE)
	$(MAKE) lint
	$(MAKE) build
	$(MAKE) test

.PHONY: travis_api
travis_api::
	$(call STEP_MESSAGE)

.PHONY: travis_cron
travis_cron::
	$(call STEP_MESSAGE)
