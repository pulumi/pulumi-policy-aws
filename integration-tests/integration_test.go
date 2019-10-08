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
	"path"
	"strings"
	"testing"
	"time"

	ptesting "github.com/pulumi/pulumi/pkg/testing"
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
	t *testing.T, pulumiProgramDir, policyPackDir string,
	initialConfig map[string]string, scenarios []policyTestScenario) {
	t.Logf("Running Policy Pack Integration Test from directory %q", pulumiProgramDir)

	cwd, err := os.Getwd()
	if err != nil {
		t.Fatalf("Error getting working directory")
	}
	testProgramDir := path.Join(cwd, pulumiProgramDir)

	stackName := fmt.Sprintf("%s-%d", pulumiProgramDir, time.Now().Unix()%100000)

	// Copy the Pulumi program to /tmp and run various operations within that directory.
	e := ptesting.NewEnvironment(t)
	e.ImportDirectory(testProgramDir)

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
	// Get the directory for the policy pack to run. (The parent of this /integration-tests directory.)
	cwd, err := os.Getwd()
	if err != nil {
		t.Fatalf("Error getting working directory")
	}
	policyPackDir := path.Join(cwd, "..")

	runPolicyPackIntegrationTest(
		t, "elasticsearch", policyPackDir,
		map[string]string{
			"aws:region": "us-west-2",
		},
		[]policyTestScenario{
			// Test scenario 1
			{
				WantErrors: []string{
					// Diagnostics
					"aws:elasticsearch:Domain (not-encrypted-at-rest):",
					"  mandatory: [elasticsearch-encrypted-at-rest] Checks if the Elasticsearch Service domains have encryption at rest enabled.",
					"  mandatory: [elasticsearch-in-vpc-only] Checks that the Elasticsearch domain is only available within a VPC, and not accessible via a public endpoint.",

					// A result of using `assert.ok`, leading to this unfortunate output. (And for every other policy violation, too.)
					"expected value 'true' to == 'undefined'",
				},
			},
			// Test scenario 2 changes the inputs, but we expect the same violations.
			{
				WantErrors: []string{
					"aws:elasticsearch:Domain (not-encrypted-at-rest):",
					"  mandatory: [elasticsearch-encrypted-at-rest] Checks if the Elasticsearch Service domains have encryption at rest enabled.",
					"  mandatory: [elasticsearch-in-vpc-only] Checks that the Elasticsearch domain is only available within a VPC, and not accessible via a public endpoint.",
				},
			},
			// Test scenario 3 fixes one of the violations. (We aren't confirming the fixed violation is _not_ in the output though.)
			{
				WantErrors: []string{
					"aws:elasticsearch:Domain (not-encrypted-at-rest):",
					"  mandatory: [elasticsearch-in-vpc-only] Checks that the Elasticsearch domain is only available within a VPC, and not accessible via a public endpoint.",
				},
			},
			// Test scenario 4 should not have any policy violations. And create the resources successfully.
			// However, we disable this scenario because it takes 10+ minutes to create the Elastisearch instance,
			// and just as long to tear it down.
			/*
				{
					WantErrors: nil,
				},
			*/
		})
}

func TestComputeEC2(t *testing.T) {
	// Get the directory for the policy pack to run. (The parent of this /integration-tests directory.)
	cwd, err := os.Getwd()
	if err != nil {
		t.Fatalf("Error getting working directory")
	}
	policyPackDir := path.Join(cwd, "..")

	runPolicyPackIntegrationTest(
		t, "compute", policyPackDir,
		map[string]string{
			"aws:region": "us-west-2",
		},
		[]policyTestScenario{
			// Test scenario 1 - happy path.
			{},
			// Test scenario 2 - monitoring is undefined.
			{
				WantErrors: []string{
					"aws:ec2:Instance (test-ec2-instance):",
					"  mandatory: [ec2-instance-detailed-monitoring-enabled] Checks whether detailed monitoring is enabled for EC2 instances.",
				},
			},
			// Test scenario 3 - monitoring is false.
			{
				WantErrors: []string{
					"aws:ec2:Instance (test-ec2-instance):",
					"  mandatory: [ec2-instance-detailed-monitoring-enabled] Checks whether detailed monitoring is enabled for EC2 instances.",
				},
			},
			// Test scenario 4 - public IP is associated.
			{
				WantErrors: []string{
					"aws:ec2:Instance (test-ec2-instance):",
					"  mandatory: [ec2-instance-no-public-ip] Checks whether Amazon EC2 instances have a public IP association. This rule applies only to IPv4.",
				},
			},
			// Test scenario 5 - load balancers do not have access logs enabled.
			{
				WantErrors: []string{
					"aws:elasticloadbalancing:LoadBalancer (test-elb):",
					"  mandatory: [elb-logging-enabled] Checks whether the Application Load Balancers and the Classic Load Balancers have logging enabled.",
					"aws:elasticloadbalancingv2:LoadBalancer (test-elb-v2):",
					"aws:applicationloadbalancing:LoadBalancer (test-alb):",
				},
			},
			// Test scenario 6 - no EBS volume attached.
			{
				WantErrors: []string{
					"aws:ec2:Instance (test-ec2-instance):",
					"  mandatory: [ec2-volume-inuse-check] Checks whether EBS volumes are attached to EC2 instances. Optionally checks if EBS volumes are marked for deletion when an instance is terminated.",
				},
			},
			// Test scenario 7 - an EBS volume that is not marked for deletion on termination of the EC2.
			{
				WantErrors: []string{
					"aws:ec2:Instance (test-ec2-instance):",
					" mandatory: [ec2-volume-inuse-check] Checks whether EBS volumes are attached to EC2 instances. Optionally checks if EBS volumes are marked for deletion when an instance is terminated.",
				},
			},
			// Test scenario 8 - an EBS volume that is not encrypted.
			{
				WantErrors: []string{
					"aws:ec2:Instance (test-ec2-instance):",
					" mandatory: [encrypted-volumes] Checks whether the EBS volumes that are in an attached state are encrypted. If you specify the ID of a KMS key for encryption using the kmsId parameter, the rule checks if the EBS volumes in an attached state are encrypted with that KMS key.",
				},
			},
		})
}
