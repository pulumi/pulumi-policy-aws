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
import { ResourceValidationPolicy, validateTypedResource } from "@pulumi/policy";

/**
   ebs-snapshot-public-restorable-check (Requires aws-sdk)
 ✓ efs-encrypted-check
 ✓ elb-deletion-protection-enabled
   s3-blacklisted-actions-prohibited
 ✓ s3-bucket-logging-enabled
   s3-bucket-policy-grantee-check
   s3-bucket-policy-not-more-permissive
   s3-bucket-public-read-prohibited
   s3-bucket-public-write-prohibited
   s3-bucket-replication-enabled
   s3-bucket-server-side-encryption-enabled
   s3-bucket-ssl-requests-only
   s3-bucket-versioning-enabled
 */
export const storage: ResourceValidationPolicy[] = [
    {
        name: "efs-encrypted-check",
        description: "Checks whether Amazon Elastic File System (Amazon EFS) is configured to encrypt the file data using AWS Key Management Service (AWS KMS).",
        enforcementLevel: "advisory",
        validateResource: validateTypedResource(aws.efs.FileSystem, (fileSystem, args, reportViolation) => {
            if (!fileSystem.kmsKeyId) {
                reportViolation("Amazon Elastic File System must have a KMS Key defined.");
            }
        }),
    },
    {
        name: "elb-deletion-protection-enabled",
        description: "Checks whether Elastic Load Balancing has deletion protection enabled.",
        enforcementLevel: "advisory",
        validateResource: [
            validateTypedResource(aws.applicationloadbalancing.LoadBalancer, (loadBalancer, args, reportViolation) => {
                if (loadBalancer.enableDeletionProtection === undefined || loadBalancer.enableDeletionProtection === false) {
                    reportViolation("Deletion Protection must be enabled.");
                }
            }),
            validateTypedResource(aws.elasticloadbalancingv2.LoadBalancer, (loadBalancer, args, reportViolation) => {
                if (loadBalancer.enableDeletionProtection === undefined || loadBalancer.enableDeletionProtection === false) {
                    reportViolation("Deletion Protection must be enabled.");
                }
            }),
        ],
    },
    {
        name: "s3-bucket-logging-enabled",
        description: "Checks whether logging is enabled for your S3 buckets.",
        enforcementLevel: "advisory",
        validateResource: validateTypedResource(aws.s3.Bucket, (bucket, args, reportViolation) => {
            // AWS will ensure the `targetBucket` exists and is WRITE-able.
            if (!bucket.loggings || bucket.loggings.length === 0) {
                reportViolation("Bucket logging must be defined.");
            }
        }),
    },
];
