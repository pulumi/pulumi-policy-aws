// Copyright 2016-2024, Pulumi Corporation.
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

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();
const testScenario = config.getNumber("scenario");

export let result: pulumi.Output<string>;

console.log(`Running test scenario #${testScenario}`);

switch (testScenario) {
    case 1:
        // Happy Path.
        break;
    case 2:
        const role1 = new aws.iam.Role("role1", {
            assumeRolePolicy: JSON.stringify({
                Version: "2012-10-17",
                Statement: [{
                    Action: "sts:AssumeRole",
                    Effect: "Allow",
                    Sid: "",
                    Principal: {
                        Service: "lambda.amazonaws.com",
                    },
                }],
            }),
            managedPolicyArns: [
                "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
            ],
        });

        const policy = aws.iam.getPolicyDocument({
            statements: [{
                effect: "Allow",
                actions: ["ec2:Describe*"],
                resources: ["*"],
            }],
        });

        const policy1 = new aws.iam.Policy("policy", {
            description: "A test policy",
            policy: policy.then(policy => policy.json),
        });

        const roleAttach1 = new aws.iam.RolePolicyAttachment("rpa", {
            role: role1.name,
            policyArn: policy1.arn,
        });

        result = roleAttach1.urn;

        break;
    default:
        throw new Error(`Unexpected test scenario ${testScenario}`);
}
