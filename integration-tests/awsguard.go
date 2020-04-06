// Copyright 2016-2019, Pulumi Corporation.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package integrationtests

import (
	"bytes"
	"fmt"
	"io/ioutil"
	"os"
	"path"
	"regexp"

	"github.com/pkg/errors"

	ptesting "github.com/pulumi/pulumi/sdk/go/common/testing"
)

// Regex used to verify that policy names are reasonable.
var ruleNameRE = regexp.MustCompile("^[a-zA-Z][a-zA-Z0-9_]{1,100}$")

// awsGuardSettings contains the configuration specific to the version of the AWS Guard
// policy pack to be used for the integration test. This is how any specific configuration
// values can be used for the test. (e.g. disabling or configuring policies.)
type awsGuardSettings struct {
	// Enforcement level to use for all policies. ("" will default to "mandatory".)
	defaultEnforcementLevel string

	// Specific policies to disable. (Will set their individual enforcement levels to "disabled".)
	disablePolicies []string
}

// validate confirms the settings present are reasonable. Since we are writing these settings
// into JS code that gets executed, a malicious user could do some pretty nasty things without
// safeguards in place.
func (settings awsGuardSettings) validate() error {
	// default enforcement level
	switch settings.defaultEnforcementLevel {
	case "", "advisory", "mandatory", "disabled":
		// OK
		break
	default:
		return errors.Errorf("unrecognized default enforcement level %q", settings.defaultEnforcementLevel)
	}

	// disabled rules
	for _, policy := range settings.disablePolicies {
		if !ruleNameRE.MatchString(policy) {
			return errors.Errorf("policy name %q appears to be invalid", policy)
		}
	}

	return nil
}

// CreatePolicyPack creates a new Node module in a sub folder of the test environment.
// The awsGuardSettings will be written into the module's index.ts file.
// Returns the path to the created module's directory.
func (settings awsGuardSettings) CreatePolicyPack(e *ptesting.Environment) (string, error) {
	e.Log("Creating customized AWS Guard module")

	if err := settings.validate(); err != nil {
		return "", errors.Wrap(err, "validation error")
	}

	initialCWD := e.CWD

	moduleFolder := path.Join(e.RootPath, "custom-awsguard")
	if err := os.Mkdir(moduleFolder, os.ModeDir|os.ModePerm); err != nil {
		return "", errors.Wrap(err, "creating folder for customized AWS Guard module")
	}

	// PulumiPolicy.yaml, for the policy pack.
	pulumiPolicyYamlFilePath := path.Join(moduleFolder, "PulumiPolicy.yaml")
	if err := ioutil.WriteFile(pulumiPolicyYamlFilePath, []byte("runtime: nodejs\n"), os.ModePerm); err != nil {
		return "", errors.Wrap(err, "writing PulumiPolicy.yaml")
	}

	// package.json, defining the module itself.
	packageJSONFilePath := path.Join(moduleFolder, "package.json")
	packageJSONFileContents := `{
		"name": "custom-awsguard",
		"version": "1.0.0",
		"description": "Customized AWS Guard policy pack for integration tests.",
		"main": "index.js",
		"dependencies": {
			"@pulumi/awsguard": "latest"
		}
	  }`
	if err := ioutil.WriteFile(packageJSONFilePath, []byte(packageJSONFileContents), os.ModePerm); err != nil {
		return "", errors.Wrap(err, "writing package.json")
	}

	// index.js, which contains encodes the settings via code.
	indexTsFilePath := path.Join(moduleFolder, "index.js")
	indexTsFileContents := settings.renderIndexJSFile()
	if err := ioutil.WriteFile(indexTsFilePath, []byte(indexTsFileContents), os.ModePerm); err != nil {
		return "", errors.Wrap(err, "writing index.js")
	}

	// Run `yarn` in the custom policy packs folder, to download the AWS Guard module as
	// a dependency.
	e.CWD = moduleFolder
	e.RunCommand("yarn", "install")
	e.RunCommand("yarn", "link", "@pulumi/awsguard")
	e.CWD = initialCWD

	return moduleFolder, nil
}

// renderIndexJSFile returns the contents of the customized index.js file.
func (settings awsGuardSettings) renderIndexJSFile() string {
	contents := bytes.NewBufferString(`// Generated code. Do not edit.
const awsguard = require("@pulumi/awsguard");
new awsguard.AwsGuard({
`)

	// Write the default enforcement level.
	if settings.defaultEnforcementLevel == "" {
		settings.defaultEnforcementLevel = "mandatory"
	}
	contents.WriteString(fmt.Sprintf("\tall: '%s',\n", settings.defaultEnforcementLevel))

	// Configure every policy we wish to disable.
	for _, policyToDisable := range settings.disablePolicies {
		line := fmt.Sprintf("'%s': 'disabled',", policyToDisable)
		contents.WriteString(fmt.Sprintf("\t%s\n", line))
	}
	contents.WriteString("});\n")

	return contents.String()
}
