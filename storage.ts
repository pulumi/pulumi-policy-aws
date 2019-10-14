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
        ]
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
