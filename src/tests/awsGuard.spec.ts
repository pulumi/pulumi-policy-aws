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

import * as assert from "assert";

import "mocha";

import { EnforcementLevel, Policies } from "@pulumi/policy";

import { AwsGuardArgs, getNameAndArgs, getPolicies, PolicyFactory } from "../awsGuard";
import * as compute from "../compute";

// Make mixins available.
import "../index";

type Expected = { name: string, enforcementLevel: EnforcementLevel };

describe("#AwsGuard", () => {
    describe("getNameAndArgs", () => {
        it("returns the expected values for the inputs", () => {
            const defaultName = "pulumi-awsguard";
            assert.deepStrictEqual(getNameAndArgs(), [defaultName, undefined]);
            assert.deepStrictEqual(getNameAndArgs("hi"), ["hi", undefined]);
            assert.deepStrictEqual(getNameAndArgs({}), [defaultName, {}]);
            assert.deepStrictEqual(getNameAndArgs({ all: "advisory" }), [defaultName, { all: "advisory" }]);
            assert.deepStrictEqual(
                getNameAndArgs({ ec2VolumeInUseCheck: "advisory" }),
                [defaultName, { ec2VolumeInUseCheck: "advisory" }]);
            assert.deepStrictEqual(
                getNameAndArgs({ ec2VolumeInUseCheck: { checkDeletion: true } }),
                [defaultName, { ec2VolumeInUseCheck: { checkDeletion: true } }]);
            assert.deepStrictEqual(getNameAndArgs("hi", {}), ["hi", {}]);
            assert.deepStrictEqual(getNameAndArgs("hi", { all: "advisory" }), ["hi", { all: "advisory" }]);
            assert.deepStrictEqual(
                getNameAndArgs(undefined, { all: "mandatory" }),
                [defaultName, { all: "mandatory" }]);
            assert.deepStrictEqual(getNameAndArgs({}, { all: "disabled" }), [defaultName, {}]);
        });
    });

    describe("getPolicies", () => {
        const defaultEnforcementLevel: EnforcementLevel = "advisory";

        const factories: Record<string, PolicyFactory<any>> = {
            ec2InstanceDetailedMonitoringEnabled: compute.ec2InstanceDetailedMonitoringEnabled,
            ec2InstanceNoPublicIP: compute.ec2InstanceNoPublicIP,
            ec2VolumeInUseCheck: compute.ec2VolumeInUseCheck,
            elbAccessLoggingEnabled: compute.elbAccessLoggingEnabled,
            encryptedVolumes: compute.encryptedVolumes,
        };

        const createExpected = (enforcementLevel: EnforcementLevel) => [
            { name: "ec2-instance-detailed-monitoring-enabled", enforcementLevel },
            { name: "ec2-instance-no-public-ip", enforcementLevel },
            { name: "ec2-volume-inuse-check", enforcementLevel },
            { name: "elb-logging-enabled", enforcementLevel },
            { name: "encrypted-volumes", enforcementLevel },
        ];

        it("returns all policies with the default enforcement level for undefined, null, empty, and args with undefined or null all", () => {
            const expected = createExpected(defaultEnforcementLevel);
            assertPoliciesEqual(getPolicies(factories, undefined), expected);
            assertPoliciesEqual(getPolicies(factories, <AwsGuardArgs><unknown>null), expected);
            assertPoliciesEqual(getPolicies(factories, {}), expected);
            assertPoliciesEqual(getPolicies(factories, { all: undefined }), expected);
            assertPoliciesEqual(getPolicies(factories, { all: <EnforcementLevel><unknown>null }), expected);
        });

        it("returns all policies with the specified enforcement level in the all arg", () => {
            assertPoliciesEqual(getPolicies(factories, { all: "advisory" }), createExpected("advisory"));
            assertPoliciesEqual(getPolicies(factories, { all: "mandatory" }), createExpected("mandatory"));
        });

        it("returns no policies when all is set to disabled", () => {
            const actual = getPolicies(factories, { all: "disabled" });
            assert.strictEqual(actual.length, 0);
        });

        it("returns all policies except those that are explicitly disabled", () => {
            const expected: Expected[] = [
                { name: "ec2-instance-detailed-monitoring-enabled", enforcementLevel: defaultEnforcementLevel },
                { name: "elb-logging-enabled", enforcementLevel: defaultEnforcementLevel },
                { name: "encrypted-volumes", enforcementLevel: defaultEnforcementLevel },
            ];
            const actual = getPolicies(factories, {
                ec2InstanceNoPublicIP: "disabled",
                ec2VolumeInUseCheck: "disabled",
            });
            assertPoliciesEqual(actual, expected);
        });

        it("returns all policies except those that are explicitly disabled through args", () => {
            const expected: Expected[] = [
                { name: "ec2-instance-detailed-monitoring-enabled", enforcementLevel: defaultEnforcementLevel },
                { name: "ec2-instance-no-public-ip", enforcementLevel: defaultEnforcementLevel },
                { name: "elb-logging-enabled", enforcementLevel: defaultEnforcementLevel },
            ];
            const actual = getPolicies(factories, {
                ec2VolumeInUseCheck: { enforcementLevel: "disabled" },
                encryptedVolumes: { enforcementLevel: "disabled" },
            });
            assertPoliciesEqual(actual, expected);
        });

        it("returns policies that are explicitly enabled", () => {
            const expected: Expected[] = [
                { name: "ec2-instance-detailed-monitoring-enabled", enforcementLevel: "mandatory" },
                { name: "encrypted-volumes", enforcementLevel: "advisory" },
            ];
            const actual = getPolicies(factories, {
                all: "disabled",
                ec2InstanceDetailedMonitoringEnabled: "mandatory",
                encryptedVolumes: "advisory",
            });
            assertPoliciesEqual(actual, expected);
        });

        it("returns all policies set to advisory with one set to mandatory", () => {
            const expected: Expected[] = [
                { name: "ec2-instance-detailed-monitoring-enabled", enforcementLevel: "advisory" },
                { name: "ec2-instance-no-public-ip", enforcementLevel: "advisory" },
                { name: "ec2-volume-inuse-check", enforcementLevel: "advisory" },
                { name: "elb-logging-enabled", enforcementLevel: "mandatory" },
                { name: "encrypted-volumes", enforcementLevel: "advisory" },
            ];
            const actual = getPolicies(factories, {
                all: "advisory",
                elbAccessLoggingEnabled: "mandatory",
            });
            assertPoliciesEqual(actual, expected);
        });

        it("returns all policies set to advisory with one set to mandatory through args", () => {
            const expected: Expected[] = [
                { name: "ec2-instance-detailed-monitoring-enabled", enforcementLevel: "advisory" },
                { name: "ec2-instance-no-public-ip", enforcementLevel: "advisory" },
                { name: "ec2-volume-inuse-check", enforcementLevel: "mandatory" },
                { name: "elb-logging-enabled", enforcementLevel: "advisory" },
                { name: "encrypted-volumes", enforcementLevel: "advisory" },
            ];
            assertPoliciesEqual(getPolicies(factories, {
                all: "advisory",
                ec2VolumeInUseCheck: { enforcementLevel: "mandatory" },
            }), expected);
            assertPoliciesEqual(getPolicies(factories, {
                all: "advisory",
                ec2VolumeInUseCheck: { enforcementLevel: "mandatory", checkDeletion: true },
            }), expected);
        });

        it("returns policies that are explicitly enabled through args", () => {
            const expected: Expected[] = [
                { name: "ec2-volume-inuse-check", enforcementLevel: "advisory" },
                { name: "encrypted-volumes", enforcementLevel: "mandatory" },
            ];
            assertPoliciesEqual(getPolicies(factories, {
                all: "disabled",
                ec2VolumeInUseCheck: { enforcementLevel: "advisory" },
                encryptedVolumes: { enforcementLevel: "mandatory" },
            }), expected);
            assertPoliciesEqual(getPolicies(factories, {
                all: "disabled",
                ec2VolumeInUseCheck: { enforcementLevel: "advisory", checkDeletion: true },
                encryptedVolumes: { enforcementLevel: "mandatory", kmsId: "id" },
            }), expected);
        });
    });
});

function assertPoliciesEqual(actual: Policies, expected: Expected[]) {
    assert.strictEqual(actual.length, expected.length);

    for (let i = 0; i < actual.length; i++) {
        assert.strictEqual(actual[i].name, expected[i].name);
        assert.strictEqual(actual[i].enforcementLevel, expected[i].enforcementLevel);
    }
}
