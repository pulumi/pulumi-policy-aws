PROJECT_NAME := awsguard
NODE_MODULE_NAME := @pulumi/awsguard
include ../build/common.mk

VERSION := $(shell ../scripts/get-version.sh)

build::
	yarn install
	yarn link @pulumi/pulumi
	yarn link @pulumi/policy
	rm -rf bin/
	yarn build
	sed -e 's/\$${VERSION}/$(VERSION)/g' < package.json > bin/package.json
	cp ../README.md ../LICENSE bin/
	node ../scripts/reversion.js bin/version.js ${VERSION}

lint::
	yarn run lint

test_fast::
	yarn run test

test_all::
	yarn run test
