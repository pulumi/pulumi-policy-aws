// Copyright 2016-2020, Pulumi Corporation.
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

func TestAPIGateway(t *testing.T) {
	runPolicyPackIntegrationTest(
		t, "apiGateway",
		awsGuardSettings{},
		map[string]string{
			"aws:region": "us-west-2",
		},
		[]policyTestScenario{
			// Test scenario 1 - Confirm the REST API and Stage objects are not compliant.
			{
				WantErrors: []string{
					"mandatory",
					"apigateway-endpoint-type",
					"API Gateway endpoint configuration",
					"must use a supported endpoint type [EDGE]. 'REGIONAL' is unsupported",
				},
			},
			// Test scenario 2 - Confirm the MethodSettings object is not compliant.
			{
				WantErrors: []string{
					"mandatory",
					"apigateway-method-cached-and-encrypted",
					"API Gateway Method 'r/GET' must have caching enabled.",
					"API Gateway Method 'r/GET' must encrypt cached responses",
				},
			},
			{
				// Everything is compliant in the third scenario.
			},
		})
}
