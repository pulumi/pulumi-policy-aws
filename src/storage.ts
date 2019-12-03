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

import * as aws from "@pulumi/aws";

import { EnforcementLevel, ResourceValidationPolicy, validateTypedResource } from "@pulumi/policy";

import { registerPolicy } from "./awsGuard";
import { defaultEnforcementLevel } from "./enforcementLevel";

// Mixin additional properties onto AwsGuardArgs.
declare module "./awsGuard" {
    interface AwsGuardArgs {
        efsEncrypted?: EnforcementLevel;
        elbDeletionProtectionEnabled?: EnforcementLevel;
        s3BucketLoggingEnabled?: EnforcementLevel;
    }
}

// Register policy factories.
registerPolicy("efsEncrypted", efsEncrypted);
registerPolicy("elbDeletionProtectionEnabled", elbDeletionProtectionEnabled);
registerPolicy("s3BucketLoggingEnabled", s3BucketLoggingEnabled);

/** @internal */
export function efsEncrypted(enforcementLevel?: EnforcementLevel): ResourceValidationPolicy {
    return {
        name: "efs-encrypted",
        description: "Checks whether Amazon Elastic File System (Amazon EFS) is configured to encrypt the file data using AWS Key Management Service (AWS KMS).",
        enforcementLevel: enforcementLevel || defaultEnforcementLevel,
        validateResource: validateTypedResource(aws.efs.FileSystem, (fileSystem, _, reportViolation) => {
            if (!fileSystem.kmsKeyId) {
                reportViolation("Amazon Elastic File System must have a KMS Key defined.");
            }
        }),
    };
}

/** @internal */
export function elbDeletionProtectionEnabled(enforcementLevel?: EnforcementLevel): ResourceValidationPolicy {
    return {
        name: "elb-deletion-protection-enabled",
        description: "Checks whether Elastic Load Balancing has deletion protection enabled.",
        enforcementLevel: enforcementLevel || defaultEnforcementLevel,
        validateResource: [
            validateTypedResource(aws.applicationloadbalancing.LoadBalancer, (loadBalancer, _, reportViolation) => {
                if (loadBalancer.enableDeletionProtection === undefined || loadBalancer.enableDeletionProtection === false) {
                    reportViolation("Deletion Protection must be enabled.");
                }
            }),
            validateTypedResource(aws.elasticloadbalancingv2.LoadBalancer, (loadBalancer, _, reportViolation) => {
                if (loadBalancer.enableDeletionProtection === undefined || loadBalancer.enableDeletionProtection === false) {
                    reportViolation("Deletion Protection must be enabled.");
                }
            }),
        ],
    };
}

/** @internal */
export function s3BucketLoggingEnabled(enforcementLevel?: EnforcementLevel): ResourceValidationPolicy {
    return {
        name: "s3-bucket-logging-enabled",
        description: "Checks whether logging is enabled for your S3 buckets.",
        enforcementLevel: enforcementLevel || defaultEnforcementLevel,
        validateResource: validateTypedResource(aws.s3.Bucket, (bucket, _, reportViolation) => {
            // AWS will ensure the `targetBucket` exists and is WRITE-able.
            if (!bucket.loggings || bucket.loggings.length === 0) {
                reportViolation("Bucket logging must be defined.");
            }
        }),
    };
}
