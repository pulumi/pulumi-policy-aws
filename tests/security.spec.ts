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
    assertHasViolation,
    assertNoViolations,
    daysFromNow,
    createResourceValidationArgs,
    PolicyViolation,
} from "./util";

import { fail } from "assert";

import * as AWS from "aws-sdk";
import * as AWSMock from "aws-sdk-mock";
import { DescribeCertificateRequest } from "aws-sdk/clients/acm";
import { ListAccessKeysRequest, ListMFADevicesRequest } from "aws-sdk/clients/iam";

// describe("#IamAccessKeysRotated", () => {
//     const maxKeyAge = 30;
//     const policy = security.IamAccessKeysRotated("mandatory", maxKeyAge);

//     const testAccessKeyId = "AKITESTKEYID";
//     const testUserEmail = "test-user@example.com";

//     it("reports no violations for inactive keys", async () => {
//         const empty = createResourceValidationArgs(aws.iam.AccessKey, () => ({}));
//         await assertNoViolations(policy, empty);

//         const inactive = createResourceValidationArgs(aws.iam.AccessKey, () => ({
//             user: testUserEmail,
//             status: "Inactive",
//         }));
//         await assertNoViolations(policy, inactive);
//     });

//     it("reports no violation for unexpired keys", async () => {
//         AWSMock.setSDKInstance(AWS);
//         AWSMock.mock("IAM", "listAccessKeys", (params: ListAccessKeysRequest, callback: Function) => {
//             const resp: AWS.IAM.ListAccessKeysResponse = {
//                 IsTruncated: false,
//                 AccessKeyMetadata: [
//                     {
//                         AccessKeyId: testAccessKeyId,
//                         CreateDate: new Date(),
//                     },
//                 ],
//             };

//             callback(null, resp);
//         });

//         const args = createResourceValidationArgs(aws.iam.AccessKey, () => ({
//             id: testAccessKeyId,
//             status: "Active",
//             user: testUserEmail,
//         }));
//         await assertNoViolations(policy, args);
//     });

//     it("Reports a violation for unrotated key", async () => {
//         const longTimeAgo = daysFromNow(-180);

//         AWSMock.restore("IAM", "listAccessKeys");
//         AWSMock.setSDKInstance(AWS);

//         // In mocking listAccessKeys, we are also confirming that function uses
//         // pagination. We return two different responses in sequence.
//         let timeCalled = 0;
//         AWSMock.mock("IAM", "listAccessKeys", (params: ListAccessKeysRequest, callback: Function) => {
//             let resp: AWS.IAM.ListAccessKeysResponse;
//             switch (timeCalled) {
//                 case 0:
//                     timeCalled++;

//                     // First response contains a single key that is still valid.
//                     resp = {
//                         IsTruncated: true,
//                         Marker: "timeCalled-1",
//                         AccessKeyMetadata: [
//                             {
//                                 AccessKeyId: testAccessKeyId+"-not-expired",
//                                 CreateDate: new Date(),
//                             },
//                         ],
//                     };
//                     break;

//                 case 1:
//                     timeCalled++;
//                     if (params.Marker !== "timeCalled-1") {
//                         fail("parameters to listAccessKeys included wrong marker");
//                     }

//                     // Second response contains an expired key.
//                     resp = {
//                         IsTruncated: false,
//                         AccessKeyMetadata: [
//                             {
//                                 AccessKeyId: testAccessKeyId,
//                                 CreateDate: longTimeAgo,
//                             },
//                         ],
//                     };
//                     break;

//                 default:
//                     fail("listAccessKeys called unexpected number of times");
//                     break;
//             }

//             callback(null, resp!);
//         });

//         const args = createResourceValidationArgs(aws.iam.AccessKey, () => ({
//             id: testAccessKeyId,
//             status: "Active",
//             user: "test-user@pulumi.com",
//         }));
//         await assertHasViolation(policy, args, {
//             message: "access key must be rotated within 30 days (key is 180 days old)",
//         });
//     });
// });

describe("#IamMfaEnabledForConsoleAccess", () => {
    const policy = security.IamMfaEnabledForConsoleAccess("mandatory");
    const testUserEmail = "test-user@example.com";

    it("Does not report a violation if an MFA device is attached", async () => {
        AWSMock.setSDKInstance(AWS);
        AWSMock.mock("IAM", "listMFADevices", (params: ListMFADevicesRequest, callback: Function) => {
            const resp: AWS.IAM.ListMFADevicesResponse = {
                MFADevices: [
                    {
                        UserName: testUserEmail,
                        SerialNumber: "xxx-xxxx-xxxx",
                        EnableDate: new Date(),
                    },
                ],
                IsTruncated: false,
            };
            callback(null, resp);
        });

        const args = createResourceValidationArgs(aws.iam.UserLoginProfile, () => ({
            pgpKey: "keybase:username",
            user: testUserEmail,
        }));
        assertNoViolations(policy, args);
    });

    it("Reports a violation if no MFA devices are attached", async () => {
        AWSMock.setSDKInstance(AWS);
        AWSMock.restore("IAM", "listMFADevices");
        AWSMock.mock("IAM", "listMFADevices", (params: ListMFADevicesRequest, callback: Function) => {
            const resp: AWS.IAM.ListMFADevicesResponse = {
                MFADevices: [],
            };
            callback(null, resp);
        });

        const args = createResourceValidationArgs(aws.iam.UserLoginProfile, () => ({
            pgpKey: "keybase:username",
            user: testUserEmail,
        }));
        assertHasViolation(policy, args, {
            message: `no MFA device enabled for IAM User '${testUserEmail}'`,
        } as PolicyViolation);
    });
});

// describe("#AcmCheckCertificateExpiration", () => {
//     const maxDaysTillExpires = 14;
//     const policy = security.AcmCheckCertificateExpiration("mandatory", maxDaysTillExpires);

//     const testCertificateArn = "arn:aws:acm:us-east-1:222222222222:certificate/aaaaaaaa-ffff-2222-eeee-1111111111111";

//     it("Does not fail if the certificate is current", async () => {
//         const monthFromNow = daysFromNow(30);

//         AWSMock.setSDKInstance(AWS);
//         AWSMock.mock("ACM", "describeCertificate", (params: DescribeCertificateRequest, callback: Function) => {
//             const resp: AWS.ACM.DescribeCertificateResponse = {
//                 Certificate: {
//                     NotAfter: monthFromNow,
//                 },
//             };
//             callback(null, resp);
//         });

//         const args = createResourceValidationArgs(aws.acm.Certificate, () => ({
//             id: testCertificateArn,
//         }));
//         await assertNoViolations(policy, args);
//     });

//     it("Fails if the certificate close to expiration", async () => {
//         const weekFromNow = daysFromNow(7);

//         AWSMock.setSDKInstance(AWS);
//         AWSMock.restore("ACM", "describeCertificate");
//         AWSMock.mock("ACM", "describeCertificate", (params: DescribeCertificateRequest, callback: Function) => {
//             const resp: AWS.ACM.DescribeCertificateResponse = {
//                 Certificate: {
//                     NotAfter: weekFromNow,
//                 },
//             };
//             callback(null, resp);
//         });

//         const args = createResourceValidationArgs(aws.acm.Certificate, () => ({
//             id: testCertificateArn,
//         }));
//         await assertNoViolations(policy, args);
//     });
// });

describe("#CmkBackingKeyRotationEnabled", () => {
    const policy = security.CmkBackingKeyRotationEnabled("mandatory");

    it("Fails if key does not have rotation enabled", async() => {
        const args = createResourceValidationArgs(aws.kms.Key, () => ({ enableKeyRotation: false }));
        await assertHasViolation(policy, args, {
            message: "CMK does not have the key rotation setting enabled",
        });
    });

    it("Does not fail if the key is configured to be rotated", async() => {
        const args = createResourceValidationArgs(aws.kms.Key, () => ({ enableKeyRotation: true }));
        await assertNoViolations(policy, args);
    });
});
