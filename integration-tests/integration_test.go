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
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	ptesting "github.com/pulumi/pulumi/sdk/v3/go/common/testing"
	"github.com/stretchr/testify/assert"
)

func abortIfFailed(t *testing.T) {
	if t.Failed() {
		t.Fatal("Aborting test as a result of unrecoverable error.")
	}
}

// policyTestScenario describes an iteration of the
type policyTestScenario struct {
	// WantErrors is the error message we expect to see in the command's output.
	WantErrors []string
}

// runPolicyPackIntegrationTest creates a new Pulumi stack and then runs through
// a sequence of test scenarios where a configuration value is set and then
// the stack is updated or previewed, confirming the expected result.
func runPolicyPackIntegrationTest(
	t *testing.T, pulumiProgramDir string,
	awsGuardSettings awsGuardSettings,
	initialConfig map[string]string, scenarios []policyTestScenario) {
	t.Logf("Running Policy Pack Integration Test from directory %q", pulumiProgramDir)

	cwd, err := os.Getwd()
	if err != nil {
		t.Fatalf("Error getting working directory")
	}
	testProgramDir := filepath.Join(cwd, pulumiProgramDir)

	stackName := fmt.Sprintf("%s-%d", pulumiProgramDir, time.Now().Unix()%100000)

	// Copy the Pulumi program to /tmp and run various operations within that directory.
	e := ptesting.NewEnvironment(t)
	e.ImportDirectory(testProgramDir)

	// Create policy pack specific for the test.
	policyPackDir, err := awsGuardSettings.CreatePolicyPack(e)
	if err != nil || t.Failed() {
		t.Fatalf("Error creating customized AWS Guard module: %v", err)
	}

	// Create the stack
	e.RunCommand("pulumi", "login", "--local")
	abortIfFailed(t)

	e.RunCommand("pulumi", "stack", "init", stackName)
	abortIfFailed(t)

	// Get dependencies
	e.RunCommand("yarn", "install")
	abortIfFailed(t)

	// Initial configuration.
	for k, v := range initialConfig {
		e.RunCommand("pulumi", "config", "set", k, v)
	}

	// After this point, we want be sure to cleanup the stack, so we don't accidentally leak
	// any cloud resources.
	defer func() {
		t.Log("Cleaning up Stack")
		e.RunCommand("pulumi", "destroy", "--yes")
		e.RunCommand("pulumi", "stack", "rm", "--yes")
	}()

	assert.True(t, len(scenarios) > 0, "no test scenarios provided")
	for idx, scenario := range scenarios {
		// Create a sub-test so go test will output data incrementally, which will let
		// a CI system like Travis know not to kill the job if no output is sent after 10m.
		// idx+1 to make it 1-indexed.
		t.Run(fmt.Sprintf("Scenario_%d", idx+1), func(t *testing.T) {
			e.T = t

			e.RunCommand("pulumi", "config", "set", "scenario", fmt.Sprintf("%d", idx+1))

			if len(scenario.WantErrors) == 0 {
				t.Log("No errors are expected.")
				e.RunCommand("pulumi", "preview", "--policy-pack", policyPackDir)
			} else {
				stdout, stderr := e.RunCommandExpectError("pulumi", "preview", "--policy-pack", policyPackDir)

				for _, wantErr := range scenario.WantErrors {
					inSTDOUT := strings.Contains(stdout, wantErr)
					inSTDERR := strings.Contains(stderr, wantErr)

					if !inSTDOUT && !inSTDERR {
						t.Errorf("Did not find expected error %q", wantErr)
					}
				}

				if t.Failed() {
					t.Logf("Command output:\nSTDOUT:\n%v\n\nSTDERR:\n%v\n\n", stdout, stderr)
				}
			}
		})
	}

	e.T = t
	t.Log("Finished test scenarios.")
	// Cleanup already registered via defer.
}

// Tests related to the Elasticsearch policies.
func TestElasticSearch(t *testing.T) {
	runPolicyPackIntegrationTest(
		t, "elasticsearch",
		awsGuardSettings{},
		map[string]string{
			"aws:region": "us-west-2",
		},
		[]policyTestScenario{
			// Test scenario 1
			{
				WantErrors: []string{
					"mandatory",
					"not-encrypted-at-rest",
					"elasticsearch-in-vpc-only",
					"must run within a VPC.",
				},
			},
			// Test scenario 2 changes the inputs, but we expect the same violations.
			{
				WantErrors: []string{
					"mandatory",
					"not-encrypted-at-rest",
					"elasticsearch-in-vpc-only",
					"must run within a VPC.",
				},
			},
			// Test scenario 3 fixes one of the violations. (We aren't confirming the fixed violation is _not_ in the output though.)
			{
				WantErrors: []string{
					"not-encrypted-at-rest",
					"elasticsearch-in-vpc-only",
					"must run within a VPC.",
				},
			},
			// Test scenario 4 should not have any policy violations. And create the resources successfully.
			// Since we are only running a preview, we can run this scenario without it taking 10+ minutes to
			// create the Elasticsearch instance, however we do not want this to run if we end up using
			// pulumi up for our tests.
			{
				WantErrors: nil,
			},
		})
}

func TestIAM(t *testing.T) {
	runPolicyPackIntegrationTest(
		t, "iam",
		awsGuardSettings{},
		map[string]string{
			"aws:region": "us-west-2",
		},
		[]policyTestScenario{
			// Test scenario 1 and 2 - happy path.
			{}, {},
			// Test scenario 3 - managedPolicyArns conflict.
			{
				WantErrors: []string{"RolePolicyAttachment should not be used with a role"},
			},
		},
	)
}

func TestComputeEC2(t *testing.T) {
	runPolicyPackIntegrationTest(
		t, "compute",
		awsGuardSettings{},
		map[string]string{
			"aws:region": "us-west-2",
		},
		[]policyTestScenario{
			// Test scenario 1 - happy path.
			{},
			// Test scenario 2 - monitoring is undefined.
			{
				WantErrors: []string{
					"mandatory",
					"test-ec2-instance",
					"ec2-instance-detailed-monitoring-enabled",
					"EC2 instances must have detailed monitoring enabled",
				},
			},
			// Test scenario 3 - monitoring is false.
			{
				WantErrors: []string{
					"mandatory",
					"ec2-instance-detailed-monitoring-enabled",
					"EC2 instances must have detailed monitoring enabled",
				},
			},
			// Test scenario 4 - public IP is associated.
			{
				WantErrors: []string{
					"mandatory",
					"ec2-instance-no-public-ip",
					"EC2 instance must not have a public IP.",
				},
			},
			// Test scenario 5 - load balancers do not have access logs enabled.
			{
				WantErrors: []string{
					"mandatory",
					"elb-logging-enabled",
					"Elastic Load Balancer must have access logs enabled.",
				},
			},
			// Test scenario 6 - no EBS volume attached.
			{
				WantErrors: []string{
					"mandatory",
					"ec2-volume-inuse",
					"EC2 instance must have an EBS volume attached",
				},
			},
			// Test scenario 7 - an attached EBS volume that is not marked for deletion on termination of the EC2
			// and is not encrypted.
			{
				WantErrors: []string{
					"mandatory",
					"ec2-volume-inuse",
					"ECS instance's EBS volume ", "must be marked for termination on delete.",
					"encrypted-volumes",
					"EBS volume ", "must be encrypted.",
				},
			},
			// Test scenario 8 - an EBS root volume with encryption set to false.
			{
				WantErrors: []string{
					"mandatory",
					"encrypted-volumes",
					"The EC2 instance root block device must be encrypted.",
				},
			},
			// Test scenario 9 - no EBS root volume settings defined which means encryption defaults to
			// false.
			{
				WantErrors: []string{
					"mandatory",
					"encrypted-volumes",
					"The EC2 instance root block device must be encrypted.",
				},
			},
			// Test scenario 10 - A egress type SecurityGroupRule attached to a SecurityGroup with inline rules
			{
				WantErrors: []string{
					"mandatory",
					"security-group-no-rule-management-conflicts",
					"SecurityGroupRule test-sg-rule defines rules for SecurityGroup test-sg which has inline 'egress' rules",
				},
			},
			// Test scenario 11 - A ingress type SecurityGroupRule attached to a SecurityGroup with inline rules
			{
				WantErrors: []string{
					"mandatory",
					"security-group-no-rule-management-conflicts",
					"SecurityGroupRule test-sg-rule defines rules for SecurityGroup test-sg which has inline 'ingress' rules",
				},
			},
			// Test scenario 12 - A SecurityGroupIngressRule attached to a SecurityGroup with inline rules
			{
				WantErrors: []string{
					"mandatory",
					"security-group-no-rule-management-conflicts",
					"SecurityGroupIngressRule test-sg-ingress-rule defines rules for SecurityGroup test-sg which has inline 'ingress' rules",
				},
			},
			// Test scenario 13 - A SecurityGroupEgressRule attached to a SecurityGroup with inline rules
			{
				WantErrors: []string{
					"mandatory",
					"security-group-no-rule-management-conflicts",
					"SecurityGroupEgressRule test-sg-egress-rule defines rules for SecurityGroup test-sg which has inline 'egress' rules",
				},
			},
		})
}
