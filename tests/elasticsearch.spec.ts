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

import "mocha";

import * as aws from "@pulumi/aws";

import * as elasticsearch from "../elasticsearch";
import { assertHasViolation, assertNoViolations, fakeResource } from "./util";

describe("#ElasticsearchEncryptedAtRest", () => {
    const policy = elasticsearch.ElasticsearchEncryptedAtRest("mandatory");
    const policyArgs = {
        type: (<any>aws.elasticsearch.Domain).__pulumiType,
        props: {},
    };
    it("Should fail if domain's encryptAtRest is undefined", async () => {
        const domainUnderTest = fakeResource<aws.elasticsearch.Domain>({
            domainName: "test-name",
        });
        policyArgs.props = domainUnderTest;

        const msg = `Elasticsearch domain ${domainUnderTest.domainName} must be encrypted at rest.`;
        await assertHasViolation(policy, policyArgs, { message: msg });
    });
    it("Should fail if domain's encryptAtRest is disabled", async () => {
        const domainUnderTest = fakeResource<aws.elasticsearch.Domain>({
            domainName: "test-name",
            encryptAtRest: {
                enabled: false,
            },
        });
        policyArgs.props = domainUnderTest;

        const msg = `Elasticsearch domain ${domainUnderTest.domainName} must be encrypted at rest.`;
        await assertHasViolation(policy, policyArgs, { message: msg });
    });

    it("Should pass if encryptAtRest is enabled", async () => {
        const domainUnderTest = fakeResource<aws.elasticsearch.Domain>({
            domainName: "test-name",
            encryptAtRest: {
                enabled: true,
            },
        });
        policyArgs.props = domainUnderTest;

        await assertNoViolations(policy, policyArgs);
    });
});

describe("#ElasticsearchInVpcOnly", () => {
    const policy = elasticsearch.ElasticsearchInVpcOnly("mandatory");
    const domainType = (<any>aws.elasticsearch.Domain).__pulumiType;
    it("Should fail if no VPC options are available", async () => {
        const noVpc = fakeResource<aws.elasticsearch.Domain>({});
        const policyArgs = {
            type: domainType,
            props: noVpc,
        };

        await assertHasViolation(policy, policyArgs, { message: "must run within a VPC." });
    });

    it("Should pass if VPC options are available", async () => {
        const vpc = fakeResource<aws.elasticsearch.Domain>({ vpcOptions: {} });
        const vpcPolicyArgs = {
            type: domainType,
            props: vpc,
        };

        await assertNoViolations(policy, vpcPolicyArgs);
    });
});
