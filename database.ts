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

export const database: ResourceValidationPolicy[] = [
    redshiftClusterConfigurationCheck("mandatory", true /* clusterDbEncrypted */, true /* loggingEnabled */),
    redshiftClusterMaintenanceSettingsCheck("mandatory", true /* allowVersionUpgrade */),
    redshiftClusterPublicAccessCheck("mandatory"),
    dynamodbTableEncryptionEnabled("mandatory"),
    dbInstanceBackupEnabled("mandatory"),
    rdsInstancePublicAccessCheck("mandatory"),
    rdsStorageEncrypted("mandatory"),
];

/**
 *
 * @param [enforcementLevel="advisory"] The enforcement level to enforce this policy with.
 * @param [clusterDbEncrypted=true] If true, database encryption is enabled.
 * @param [loggingEnabled=true] If true, audit logging must be enabled.
 * @param [nodeTypes] List of allowed node types.
 */
export function redshiftClusterConfigurationCheck(
    enforcementLevel: EnforcementLevel = "advisory", clusterDbEncrypted: boolean = true,
    loggingEnabled: boolean = true, nodeTypes?: string[]): ResourceValidationPolicy {
    return {
        name: "redshift-cluster-configuration-check",
        description: "Checks whether Amazon Redshift clusters have the specified settings.",
        enforcementLevel: enforcementLevel,
        validateResource: validateTypedResource(aws.redshift.Cluster, (cluster, args, reportViolation) => {

            // Check the cluster's encryption configuration.
            if (clusterDbEncrypted && (cluster.encrypted === undefined || cluster.encrypted === false)) {
                reportViolation("Redshift cluster must be encrypted.");
            } else if (!clusterDbEncrypted && cluster.encrypted === true) {
                reportViolation("Redshift cluster must not be encrypted.");
            }

            // Check the cluster's node type.
            if (nodeTypes && !nodeTypes.includes(cluster.nodeType)) {
                reportViolation(`Redshift cluster node type must be one of the following: ${nodeTypes.toString()}`);
            }

            // Check the cluster's logging configuration.
            if (loggingEnabled && (cluster.logging === undefined || cluster.logging.enable === false)) {
                reportViolation(`Redshift cluster must have logging enabled.`);
            } else if (!loggingEnabled && cluster.logging && cluster.logging.enable === true) {
                reportViolation(`Redshift cluster must not have logging enabled.`);
            }
        }),
    };
}

/**
 *
 * @param [enforcementLevel="advisory"] The enforcement level to enforce this policy with.
 * @param [allowVersionUpgrade=true] Allow version upgrade is enabled. Defaults to true.
 * @param [preferredMaintenanceWindow] Scheduled maintenance window for clusters (for example, Mon:09:30-Mon:10:00).
 * @param [automatedSnapshotRetentionPeriod] Number of days to retain automated snapshots.
 */
export function redshiftClusterMaintenanceSettingsCheck(
    enforcementLevel: EnforcementLevel = "advisory", allowVersionUpgrade: boolean = true,
    preferredMaintenanceWindow?: string, automatedSnapshotRetentionPeriod?: number): ResourceValidationPolicy {
    return {
        name: "redshift-cluster-maintenance-settings-check",
        description: "Checks whether Amazon Redshift clusters have the specified maintenance settings.",
        enforcementLevel: enforcementLevel,
        validateResource: validateTypedResource(aws.redshift.Cluster, (cluster, args, reportViolation) => {
            // Check the allowVersionUpgrade is configured properly.
            if (allowVersionUpgrade && cluster.allowVersionUpgrade !== undefined && cluster.allowVersionUpgrade === false) {
                reportViolation("Redshift cluster must allow version upgrades.");
            } else if (!allowVersionUpgrade && (cluster.allowVersionUpgrade === undefined || cluster.allowVersionUpgrade)) {
                reportViolation("Redshift cluster must not allow version upgrades.");
            }

            // Check the preferredMaintenanceWindow is configured properly.
            if (preferredMaintenanceWindow && cluster.preferredMaintenanceWindow !== preferredMaintenanceWindow) {
                reportViolation(`Redshift cluster must specify the preferred maintenance window: ${preferredMaintenanceWindow}.`);
            }

            // Check the automatedSnapshotRetentionPeriod is configured properly. If undefined, the default is 1.
            if (automatedSnapshotRetentionPeriod) {
                if (cluster.automatedSnapshotRetentionPeriod === undefined && automatedSnapshotRetentionPeriod !== 1) {
                    reportViolation(`Redshift cluster must specify an automated snapshot retention period of ${automatedSnapshotRetentionPeriod}.`);
                } else if (cluster.automatedSnapshotRetentionPeriod !== undefined && cluster.automatedSnapshotRetentionPeriod !== automatedSnapshotRetentionPeriod) {
                    reportViolation(`Redshift cluster must specify an automated snapshot retention period of ${automatedSnapshotRetentionPeriod}.`);
                }
            }
        }),
    };
}

/**
 *
 * @param [enforcementLevel="advisory"] The enforcement level to enforce this policy with.
 */
export function redshiftClusterPublicAccessCheck(
    enforcementLevel: EnforcementLevel = "advisory"): ResourceValidationPolicy {
    return {
        name: "redshift-cluster-public-access-check",
        description: "Checks whether Amazon Redshift clusters are not publicly accessible.",
        enforcementLevel: enforcementLevel,
        validateResource: validateTypedResource(aws.redshift.Cluster, (cluster, args, reportViolation) => {
            if (cluster.publiclyAccessible === undefined || cluster.publiclyAccessible) {
                reportViolation("Redshift cluster must not be publicly accessible.");
            }
        }),
    };
}

/**
 * 
 * @param enforcementLevel The enforcement level to enforce this policy with.
 */
export function dynamodbTableEncryptionEnabled(
    enforcementLevel: EnforcementLevel = "advisory"): ResourceValidationPolicy {
    return {
        name: "dynamodb-table-encryption-enabled",
        description: "Checks whether the Amazon DynamoDB tables are encrypted.",
        enforcementLevel: enforcementLevel,
        validateResource: validateTypedResource(aws.dynamodb.Table, (table, args, reportViolation) => {
            if (table.serverSideEncryption && !table.serverSideEncryption.enabled) {
                reportViolation("Dynamodb must have server side encryption enabled.");
            }
        }),
    };
}

/**
 *
 * @param [enforcementLevel="advisory"] The enforcement level to enforce this policy with.
 * @param [backupRetentionPeriod] Retention period for backups.
 * @param [preferredBackupWindow] Time range in which backups are created.
 * @param [checkReadReplicas=true] Checks whether RDS DB instances have backups enabled for read replicas.
 */
export function dbInstanceBackupEnabled(
    enforcementLevel: EnforcementLevel = "advisory",
    backupRetentionPeriod?: number,
    preferredBackupWindow?: string,
    checkReadReplicas: boolean = true): ResourceValidationPolicy {
    return {
        name: "db-instance-backup-enabled",
        description: "Checks whether RDS DB instances have backups enabled. " +
            "Optionally, the rule checks the backup retention period and the backup window.",
        enforcementLevel: enforcementLevel,
        validateResource: validateTypedResource(aws.rds.Instance, (instance, args, reportViolation) => {
            if (backupRetentionPeriod && backupRetentionPeriod === 0) {
                console.log("A retention period of 0 means backups are disabled.");
                process.exit(1);
            }

            // Run checks if the instance is not a read replica or if check read replicas is true.
            if (!instance.replicateSourceDb || checkReadReplicas) {
                if (instance.backupRetentionPeriod !== undefined && instance.backupRetentionPeriod === 0) {
                    reportViolation("RDS Instances must have backups enabled.");
                }

                // Check the backup retention period. The backupRetentionPeriod of an instance defaults to 7 days.
                if (backupRetentionPeriod) {
                    if ((!instance.backupRetentionPeriod && backupRetentionPeriod !== 7) ||
                        (instance.backupRetentionPeriod && backupRetentionPeriod !== instance.backupRetentionPeriod)) {
                        reportViolation(`RDS Instances must have a backup retention period of: ${backupRetentionPeriod}.`);
                    }
                }
                // Check the preferred backup window.
                if (preferredBackupWindow) {
                    if (!instance.backupWindow || preferredBackupWindow !== instance.backupWindow) {
                        reportViolation(`RDS Instances must have a backup preferred back up window of: ${preferredBackupWindow}.`);
                    }
                }
            }
        }),
    };
}

/**
 *
 * @param [enforcementLevel="advisory"] The enforcement level to enforce this policy with.
 */
export function rdsInstancePublicAccessCheck(enforcementLevel: EnforcementLevel = "advisory"): ResourceValidationPolicy {
    return {
        name: "rds-instance-public-access-check",
        description: "Check whether the Amazon Relational Database Service instances are not publicly accessible.",
        enforcementLevel: enforcementLevel,
        validateResource: validateTypedResource(aws.rds.Instance, (instance, args, reportViolation) => {
            if (instance.publiclyAccessible) {
                reportViolation("RDS Instance must not be publicly accessible.");
            }
        }),
    };
}

/**
 *
 * @param [enforcementLevel="advisory"] The enforcement level to enforce this policy with.
 * @param [kmsKeyId] KMS key ID or ARN used to encrypt the storage.
 */
export function rdsStorageEncrypted(enforcementLevel: EnforcementLevel = "advisory", kmsKeyId?: string): ResourceValidationPolicy {
    return {
        name: "rds-storage-encrypted",
        description: "Checks whether storage encryption is enabled for your RDS DB instances.",
        enforcementLevel: enforcementLevel,
        validateResource: validateTypedResource(aws.rds.Instance, (instance, args, reportViolation) => {
            // Read replicas ignore this field and instead use the kmsId, so we will only check this
            // if its not a read replica.
            if (!instance.replicateSourceDb) {
                if (instance.storageEncrypted === undefined || instance.storageEncrypted === false) {
                    reportViolation("RDS Instance must have storage encryption enabled.");
                }
            }
            if (kmsKeyId && (instance.kmsKeyId === undefined || instance.kmsKeyId !== kmsKeyId)) {
                reportViolation(`RDS Instance must be encrypted with kms key id: ${kmsKeyId}.`);
            }
        }),
    };
}
