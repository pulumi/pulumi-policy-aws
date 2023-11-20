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

import * as security from "../security";

import {
    assertHasResourceViolation, assertHasStackViolation,
    assertNoResourceViolations, assertNoStackViolations,
    createResourceValidationArgs, createStackValidationArgs,
    daysFromNow, PolicyViolation,
} from "./util";

import { fail } from "assert";

import { mockClient } from "aws-sdk-client-mock";
import { IAM, ListAccessKeysCommand, ListMFADevicesCommand } from "@aws-sdk/client-iam";

describe("#iamAccessKeysRotated", () => {
    const policy = security.iamAccessKeysRotated;

    const testAccessKeyId = "AKITESTKEYID";
    const testUserEmail = "test-user@example.com";

    it("reports no violations for inactive keys", async () => {
        const emptyKeyArgs = createStackValidationArgs(aws.iam.AccessKey, {});
        await assertNoStackViolations(policy, emptyKeyArgs);

        const inactiveKeyArgs = createStackValidationArgs(aws.iam.AccessKey, {
            user: testUserEmail,
            status: "Inactive",
        });
        await assertNoStackViolations(policy, inactiveKeyArgs);
    });

    it("reports no violation for unexpired keys", async () => {
        const mockIam = mockClient(IAM);
        mockIam.on(ListAccessKeysCommand)
            .resolves({
                IsTruncated: false,
                AccessKeyMetadata: [
                    {
                        AccessKeyId: testAccessKeyId,
                        CreateDate: new Date(),
                    },
                ],
            });
            
        const args = createStackValidationArgs(aws.iam.AccessKey, {
            id: testAccessKeyId,
            status: "Active",
            user: testUserEmail,
        });
        await assertNoStackViolations(policy, args);
    });

    it("Reports a violation for unrotated key", async () => {
        const longTimeAgo = daysFromNow(-180);

        // In mocking listAccessKeys, we are also confirming that function uses
        // pagination. We return two different responses in sequence.
        const mockIam = mockClient(IAM);
        mockIam.on(ListAccessKeysCommand)
            .resolvesOnce({
                IsTruncated: true,
                Marker: "timeCalled-1",
                AccessKeyMetadata: [
                    {
                        AccessKeyId: testAccessKeyId + "-not-expired",
                        CreateDate: new Date(),
                    },
                ],
            })
            .resolvesOnce({
                IsTruncated: false,
                AccessKeyMetadata: [
                    {
                        AccessKeyId: testAccessKeyId,
                        CreateDate: longTimeAgo,
                    },
                ],
            })
            .resolves({
                IsTruncated: false,
                AccessKeyMetadata: [],
            });

        const args = createStackValidationArgs(aws.iam.AccessKey, {
            id: testAccessKeyId,
            status: "Active",
            user: "test-user@pulumi.com",
        }, {
            maxKeyAge: 30,
        });
        await assertHasStackViolation(policy, args, {
            message: "access key must be rotated within 30 days",
        });
    });
});

describe("#iamMfaEnabledForConsoleAccess", () => {
    const policy = security.iamMfaEnabledForConsoleAccess;
    const testUserEmail = "test-user@example.com";

    it("Does not report a violation if an MFA device is attached", async () => {
        const mockIam = mockClient(IAM);
        mockIam.on(ListMFADevicesCommand)
            .resolves({
                MFADevices: [
                    {
                        UserName: testUserEmail,
                        SerialNumber: "xxx-xxxx-xxxx",
                        EnableDate: new Date(),
                    },
                ],
                IsTruncated: false,
            });

        const args = createResourceValidationArgs(aws.iam.UserLoginProfile, {
            pgpKey: "keybase:username",
            user: testUserEmail,
        });
        assertNoResourceViolations(policy, args);
    });

    it("Reports a violation if no MFA devices are attached", async () => {
        const mockIam = mockClient(IAM);
        mockIam.on(ListMFADevicesCommand)
            .resolves({
                MFADevices: [],
            });

        const args = createResourceValidationArgs(aws.iam.UserLoginProfile, {
            pgpKey: "keybase:username",
            user: testUserEmail,
        });
        assertHasResourceViolation(policy, args, {
            message: `no MFA device enabled for IAM User '${testUserEmail}'`,
        } as PolicyViolation);
    });
});

describe("#cmkBackingKeyRotationEnabled", () => {
    const policy = security.cmkBackingKeyRotationEnabled;

    it("Fails if key does not have rotation enabled", async() => {
        const args = createResourceValidationArgs(aws.kms.Key, { enableKeyRotation: false });
        await assertHasResourceViolation(policy, args, {
            message: "CMK does not have the key rotation setting enabled",
        });
    });

    it("Does not fail if the key is configured to be rotated", async() => {
        const args = createResourceValidationArgs(aws.kms.Key, { enableKeyRotation: true });
        await assertNoResourceViolations(policy, args);
    });
});
