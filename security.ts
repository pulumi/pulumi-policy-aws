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

import * as AWS from "aws-sdk";

import * as aws from "@pulumi/aws";

import { EnforcementLevel, ResourceValidationPolicy, validateTypedResource } from "@pulumi/policy";

// Milliseconds in a day.
const msInDay = 24 * 60 * 60 * 1000;

export const security: ResourceValidationPolicy[] = [
    // AcmCheckCertificateExpiration("mandatory", 14 /* max days before certificate expires */),
    CmkBackingKeyRotationEnabled("mandatory"),
    // IamAccessKeysRotated("mandatory", 90 /* max key age in days */),
    IamMfaEnabledForConsoleAccess("mandatory"),
];

// export function AcmCheckCertificateExpiration(enforcementLevel: EnforcementLevel = "advisory", maxDaysUntilExpiration: number): ResourceValidationPolicy {
//     return {
//         name: "acm-certificate-expiration",
//         description: "Checks whether an ACM certificate has expired. Certificates provided by ACM are automatically renewed. ACM does not automatically renew certificates that you import.",
//         enforcementLevel: enforcementLevel,
//         validateResource: validateTypedResource(aws.iam.AccessKey, async (instance, args, reportViolation) => {
//             // Fetch the full ACM certificate using the AWS SDK to get its expiration date.
//             const acm = new AWS.ACM();
//             const describeCertResp = await acm.describeCertificate({ CertificateArn: instance.id }).promise();

//             const cert = describeCertResp.Certificate;
//             if (cert && cert.NotAfter) {
//                 let daysUntilExpiry = (cert.NotAfter.getTime() - Date.now()) / msInDay;
//                 daysUntilExpiry = Math.floor(daysUntilExpiry);

//                 if (daysUntilExpiry < maxDaysUntilExpiration) {
//                     reportViolation(`certificate expires in ${daysUntilExpiry} (max allowed ${maxDaysUntilExpiration} days)`);
//                 }
//             }
//         }),
//     };
// }

export function CmkBackingKeyRotationEnabled(enforcementLevel: EnforcementLevel = "advisory"): ResourceValidationPolicy {
    return {
        name: "cmk-backing-key-rotation-enabled",
        description: "Checks that key rotation is enabled for each customer master key (CMK). Checks that key rotation is enabled for specific key object. Does not apply to CMKs that have imported key material.",
        enforcementLevel: enforcementLevel,
        validateResource: validateTypedResource(aws.kms.Key, async (instance, args, reportViolation) => {
            if (!instance.enableKeyRotation) {
                reportViolation("CMK does not have the key rotation setting enabled");
            }
        }),
    };
}

// export function IamAccessKeysRotated(enforcementLevel: EnforcementLevel = "advisory", maxKeyAge: number): ResourceValidationPolicy {
//     if (maxKeyAge < 1 || maxKeyAge > 2 * 365) {
//         throw new Error("Invalid maxKeyAge.");
//     }

//     return {
//         name: "access-keys-rotated",
//         description: "Checks whether an access key have been rotated within maxKeyAge days.",
//         enforcementLevel: enforcementLevel,
//         validateResource: validateTypedResource(aws.iam.AccessKey, async (instance, args, reportViolation) => {
//             // Skip any access keys that haven't yet been provisioned or whose status is inactive.
//             if (!instance.id || instance.status !== "Active") {
//                 return;
//             }

//             const iam = new AWS.IAM();

//             // Use the AWS SDK to list the access keys for the user, which will contain the key's creation date.
//             let paginationToken = undefined;

//             let accessKeysResp: AWS.IAM.ListAccessKeysResponse;
//             do {
//                 accessKeysResp = await iam.listAccessKeys({ UserName: instance.user, Marker: paginationToken }).promise();
//                 for (const accessKey of accessKeysResp.AccessKeyMetadata) {
//                     if (accessKey.AccessKeyId === instance.id && accessKey.CreateDate) {
//                         let daysSinceCreated = (Date.now() - accessKey.CreateDate!.getTime()) / msInDay;
//                         daysSinceCreated = Math.floor(daysSinceCreated);
//                         if (daysSinceCreated > maxKeyAge) {
//                             reportViolation(`access key must be rotated within ${maxKeyAge} days (key is ${daysSinceCreated} days old)`);
//                         }
//                     }
//                 }

//                 paginationToken = accessKeysResp.Marker;
//             } while (accessKeysResp.IsTruncated);
//         }),
//     };
// }

export function IamMfaEnabledForConsoleAccess(enforcementLevel: EnforcementLevel = "advisory"): ResourceValidationPolicy {
    return {
        name: "mfa-enabled-for-iam-console-access",
        description: "Checks whether multi-factor Authentication (MFA) is enabled for an IAM user that use a console password.",
        enforcementLevel: enforcementLevel,
        validateResource: validateTypedResource(aws.iam.UserLoginProfile, async (instance, args, reportViolation) => {
            const iam = new AWS.IAM();
            const mfaDevicesResp = await iam.listMFADevices({ UserName: instance.user }).promise();
            // We don't bother with paging through all MFA devices, since we only check that there is at least one.
            if (mfaDevicesResp.MFADevices.length === 0) {
                reportViolation(`no MFA device enabled for IAM User '${instance.user}'`);
            }
        }),
    };
}
