import * as aws from "@pulumi/aws";
import { Policy, typedRule } from "@pulumi/policy";
import * as assert from "assert";

// TODO test
export const policies: Policy[] = [
    {
        name: "redshift-cluster-configuration-check",
        description: "Checks whether Amazon Redshift clusters have the specified settings.",
        enforcementLevel: "advisory",
        rules: typedRule(aws.redshift.Cluster.isInstance, it => {
            assert.ok(it.encrypted, "Database encryption is enabled.");
            assert.ok(it.nodeType, "Specify node type.");
            assert.ok(it.logging && it.logging.enable, "Audit logging is enabled.");
        }),
    }
];
