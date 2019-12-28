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
					"aws:apigateway:Stage (stage)",
					"mandatory: [apigateway-stage-cached] Checks that API Gateway Stages have a cache cluster enabled",
					"API Gateway Stage 'prod' does not have a cache cluster enabled.",

					"aws:apigateway:RestApi (restApi)",
					"mandatory: [apigateway-endpoint-type-check] Checks API Gateway endpoint configuration is one of the allowed types.",
					/* API Gateway 'restApi-96ff582' */ "has an unsupported endpoint type 'REGIONAL'",

					// There are other failures, but we just confirm this one for the first scenario.
				},
			},
			// Test scenario 2 - Confirm the MethodSettings object is not compliant.
			{
				WantErrors: []string{
					"aws:apigateway:MethodSettings (methodSettings)",
					"mandatory: [apigateway-method-cached-and-encrypted] Checks API Gateway Methods that responses are configured to be cached and that those cached responses are encrypted.",
					"API Gateway Method 'r/GET' does not have caching enabled.",
					"API Gateway Method 'r/GET' not configured to encrypt cached responses.",
				},
			},
			{
				// Everything is compliant in the third scenario.
			},
		})
}
