import * as aws from "@pulumi/aws";
import { Policy, typedRule } from "@pulumi/policy";
import * as assert from "assert";

export const storage: Policy[] = [
    {
        name: "ebs-snapshot-public-restorable-check",
        description: "Checks whether Amazon Elastic Block Store snapshots are not publicly restorable.",
        enforcementLevel: "advisory",
        rules: typedRule(aws.ebs.Snapshot.isInstance, it =>
            assert.ok(false, "Requires aws-sdk"),
        ),
    },
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
        name: "s3-blacklisted-actions-prohibited",
        description: "Checks that the Amazon Simple Storage Service bucket policy does not allow blacklisted bucket-level and object-level actions on resources in the bucket for principals from other AWS accounts.",
        enforcementLevel: "advisory",
        rules: typedRule(aws.s3.Bucket.isInstance, it => {
            if (it.policy === undefined) {
                return;
            }
            /** 
             * `does not allow another AWS account to perform any s3:GetBucket* actions`
             * TODO: How to check for _another_ account?
             */

            // configurable value
            const prohibitedActions = ["s3:GetBucket", "s3:DeleteObject"];

            const policyDoc = JSON.parse(it.policy);
            prohibitedActions.forEach(prohibitedAction => {
                const foundAction = policyDoc["Statement"].find((actions: any) =>
                    actions["Action"].find((action: string) =>
                        action.startsWith(prohibitedAction))
                );
                // TODO: This will fail on the first occurence - find all?
                assert.notEqual(foundAction, undefined, `${foundAction} is not an allowed action.`);
            });
        }),
    },
    {
        name: "s3-bucket-policy-grantee-check",
        description: "Checks that the access granted by the Amazon S3 bucket is restricted by any of the AWS principals, federated users, service principals, IP addresses, or VPCs that you provide.",
        enforcementLevel: "advisory",
        rules: typedRule(aws.s3.Bucket.isInstance, it => {
            if (it.policy === undefined) {
                return;
            }
            // configurable value
            const allowedAwsPrincipals = ["arn:aws:iam::111122223333:user/Alice", "123456789012"];

            // TODO compare all policy principals match allowedAwsPrincipals

            /**
             * TODO: Repeat for:
             * - `servicePrincipals`
             * - `federatedUsers`
             * - `ipAddresses`
             * - `vpcIds`
             * ref: https://docs.aws.amazon.com/config/latest/developerguide/s3-bucket-policy-grantee-check.html
             */
        }),
    },
];

new aws.s3.Bucket("asdf")
