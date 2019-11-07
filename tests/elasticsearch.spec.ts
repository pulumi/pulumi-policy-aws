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

import { expect } from "chai";
import "mocha";

import * as aws from "@pulumi/aws";

import * as assert from "assert";

import * as elasticsearch from "../elasticsearch";
import { assertHasViolation, assertNoViolations } from "./util";

describe("#ElasticsearchInVpcOnly", () => {
    it("Should fail if no VPC options are available", async () => {
        const policy = elasticsearch.ElasticsearchInVpcOnly("mandatory");
        const noVpc = fakeResource<aws.elasticsearch.Domain>({});
        assertHasViolation(policy, noVpc, { message: "must run within a VPC." });
        const vpc = fakeResource<aws.elasticsearch.Domain>({vpcOptions: {}});
        assertNoViolations(policy, vpc);
    });
});
