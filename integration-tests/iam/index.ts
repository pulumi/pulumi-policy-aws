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
    case 1: // Role with managedPolicyArns by itself - OK
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

        result = role1.arn;
        break;
    case 2: // Role with RolePolicyAttachment - OK
        const role2 = new aws.iam.Role("role1", {
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
        });

        const policyDoc2 = aws.iam.getPolicyDocument({
            statements: [{
                effect: "Allow",
                actions: ["ec2:Describe*"],
                resources: ["*"],
            }],
        });

        const policy2 = new aws.iam.Policy("policy", {
            description: "A test policy",
            policy: policyDoc2.then(policy => policy.json),
        });

        const roleAttach2 = new aws.iam.RolePolicyAttachment("rpa", {
            role: role2.name,
            policyArn: policy2.arn,
        });

        result = roleAttach2.urn;

        break;
    case 3: // Role with managedPolicyArns conflicts with RolePolicyAttachment
        const role3 = new aws.iam.Role("role1", {
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

        const policyDoc3 = aws.iam.getPolicyDocument({
            statements: [{
                effect: "Allow",
                actions: ["ec2:Describe*"],
                resources: ["*"],
            }],
        });

        const policy3 = new aws.iam.Policy("policy", {
            description: "A test policy",
            policy: policyDoc3.then(policy => policy.json),
        });

        const roleAttach3 = new aws.iam.RolePolicyAttachment("rpa", {
            role: role3.name,
            policyArn: policy3.arn,
        });

        result = roleAttach3.urn;

        break;
    default:
        throw new Error(`Unexpected test scenario ${testScenario}`);
}
