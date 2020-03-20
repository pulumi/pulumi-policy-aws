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
	"testing"
)

func TestDatabase(t *testing.T) {
	runPolicyPackIntegrationTest(
		t, "database",
		awsGuardSettings{},
		map[string]string{
			"aws:region": "us-west-2",
		},
		[]policyTestScenario{
			// Test scenario 1 - happy path for redshift cluster.
			{},
			// Test scenario 2 - monitoring is undefined.
			{
				WantErrors: []string{
					"mandatory",
					"redshift-cluster-configuration",
					"Redshift cluster must be encrypted.",
					"Redshift cluster must have logging enabled.",
					"Redshift cluster must allow version upgrades.",
					"Redshift cluster must not be publicly accessible.",
				},
			},
			// Test scenario 3 - happy path for dynamodb.
			{},
			// Test scenario 4 - dynamodb's server side encryption disabled.
			{
				WantErrors: []string{
					"mandatory",
					"dynamodb-table-encryption-enabled",
					"DynamoDB must have server side encryption enabled.",
				},
			},
			// Test scenario 5 - happy path for rds instance.
			{},
			// Test scenario 6 - rds instance has no backup.
			{
				WantErrors: []string{
					"mandatory",
					"rds-instance-backup-enabled",
					"RDS Instances must have backups enabled.",
					"RDS Instance must not be publicly accessible.",
					"RDS Instance must have storage encryption enabled.",
					"RDS Instances must be configured with multiple AZs for highly available.",
				},
			},
		})
}
