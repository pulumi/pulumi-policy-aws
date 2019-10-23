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
import { Policy, typedRule } from "@pulumi/policy";
import * as assert from "assert";

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
export const storage: Policy[] = [
    {
        name: "efs-encrypted-check",
        description: "Checks whether Amazon Elastic File System (Amazon EFS) is configured to encrypt the file data using AWS Key Management Service (AWS KMS).",
        enforcementLevel: "advisory",
        rules: typedRule(aws.efs.FileSystem.isInstance, it =>
            assert.notEqual(it.kmsKeyId, undefined, "KMS Key must be defined."),
        ),
    },
    {
        name: "elb-deletion-protection-enabled",
        description: "Checks whether Elastic Load Balancing has deletion protection enabled.",
        enforcementLevel: "advisory",
        rules: [
            typedRule(aws.applicationloadbalancing.LoadBalancer.isInstance, it =>
                assert.notEqual(it.enableDeletionProtection, true, "Deletion Protection must be enabled."),
            ),
            typedRule(aws.elasticloadbalancingv2.LoadBalancer.isInstance, it =>
                assert.notEqual(it.enableDeletionProtection, true, "Deletion Protection must be enabled."),
            ),
        ],
    },
    {
        name: "s3-bucket-logging-enabled",
        description: "Checks whether logging is enabled for your S3 buckets.",
        enforcementLevel: "advisory",
        rules: typedRule(aws.s3.Bucket.isInstance, it =>
            // AWS will ensure the `targetBucket` exists and is WRITE-able.
            assert.ok(it.loggings !== undefined && it.loggings.length > 0, "Bucket logging must be defined."),
        ),
    },
];
