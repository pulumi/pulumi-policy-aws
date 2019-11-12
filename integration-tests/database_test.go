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
	"os"
	"path"
	"testing"
)

func TestRedshiftCluster(t *testing.T) {
	// Get the directory for the policy pack to run. (The parent of this /integration-tests directory.)
	cwd, err := os.Getwd()
	if err != nil {
		t.Fatalf("Error getting working directory")
	}
	policyPackDir := path.Join(cwd, "..")

	runPolicyPackIntegrationTest(
		t, "database", policyPackDir,
		map[string]string{
			"aws:region": "us-west-2",
		},
		[]policyTestScenario{
			// Test scenario 1 - happy path.
			{},
			// Test scenario 2 - monitoring is undefined.
			{
				WantErrors: []string{
					"ws:redshift:Cluster (test-cluster):",
					"  mandatory: [redshift-cluster-configuration-check] Checks whether Amazon Redshift clusters have the specified settings.",
					"  Redshift cluster must be encrypted.",
					"  Redshift cluster must have logging enabled.",
					"  Redshift cluster must allow version upgrades.",
					"  Redshift cluster must not be publicly accessible.",
				},
			},
		})
}
