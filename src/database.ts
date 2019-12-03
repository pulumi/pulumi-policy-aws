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
import { PolicyArgs } from "./policyArgs";
import { getValueOrDefault } from "./util";

// Mixin additional properties onto AwsGuardArgs.
declare module "./awsGuard" {
    interface AwsGuardArgs {
        redshiftClusterConfiguration?: EnforcementLevel | RedshiftClusterConfigurationArgs;
        redshiftClusterMaintenanceSettings?: EnforcementLevel | RedshiftClusterMaintenanceSettingsArgs;
        redshiftClusterPublicAccess?: EnforcementLevel;
        dynamodbTableEncryptionEnabled?: EnforcementLevel;
        rdsInstanceBackupEnabled?: EnforcementLevel | RdsInstanceBackupEnabledArgs;
        rdsInstancePublicAccess?: EnforcementLevel;
        rdsStorageEncrypted?: EnforcementLevel | RdsStorageEncryptedArgs;
    }
}

// Register policy factories.
registerPolicy("redshiftClusterConfiguration", redshiftClusterConfiguration);
registerPolicy("redshiftClusterMaintenanceSettings", redshiftClusterMaintenanceSettings);
registerPolicy("redshiftClusterPublicAccess", redshiftClusterPublicAccess);
registerPolicy("dynamodbTableEncryptionEnabled", dynamodbTableEncryptionEnabled);
registerPolicy("rdsInstanceBackupEnabled", rdsInstanceBackupEnabled);
registerPolicy("rdsInstancePublicAccess", rdsInstancePublicAccess);
registerPolicy("rdsStorageEncrypted", rdsStorageEncrypted);

export interface RedshiftClusterConfigurationArgs extends PolicyArgs {
    /** If true, database encryption is enabled. Defaults to true. */
    clusterDbEncrypted?: boolean;

    /** If true, audit logging must be enabled. Defaults to true. */
    loggingEnabled?: boolean;

    /** List of allowed node types. */
    nodeTypes?: string[];
}

/** @internal */
export function redshiftClusterConfiguration(
    args?: EnforcementLevel | RedshiftClusterConfigurationArgs): ResourceValidationPolicy {

    const { enforcementLevel, clusterDbEncrypted, loggingEnabled, nodeTypes } = getValueOrDefault(args, {
        enforcementLevel: defaultEnforcementLevel,
        clusterDbEncrypted: true,
        loggingEnabled: true,
    });

    return {
        name: "redshift-cluster-configuration",
        description: "Checks whether Amazon Redshift clusters have the specified settings.",
        enforcementLevel: enforcementLevel,
        validateResource: validateTypedResource(aws.redshift.Cluster, (cluster, _, reportViolation) => {

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

export interface RedshiftClusterMaintenanceSettingsArgs extends PolicyArgs {
    /** Allow version upgrade is enabled. Defaults to true. */
    allowVersionUpgrade?: boolean;

    /** Scheduled maintenance window for clusters (for example, Mon:09:30-Mon:10:00) */
    preferredMaintenanceWindow?: string;

    /** Number of days to retain automated snapshots. */
    automatedSnapshotRetentionPeriod?: number;
}

/** @internal */
export function redshiftClusterMaintenanceSettings(
    args?: EnforcementLevel | RedshiftClusterMaintenanceSettingsArgs): ResourceValidationPolicy {

    const { enforcementLevel, allowVersionUpgrade, preferredMaintenanceWindow, automatedSnapshotRetentionPeriod } = getValueOrDefault(args, {
        enforcementLevel: defaultEnforcementLevel,
        allowVersionUpgrade: true,
    });

    return {
        name: "redshift-cluster-maintenance-settings",
        description: "Checks whether Amazon Redshift clusters have the specified maintenance settings.",
        enforcementLevel: enforcementLevel,
        validateResource: validateTypedResource(aws.redshift.Cluster, (cluster, _, reportViolation) => {
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

/** @internal */
export function redshiftClusterPublicAccess(enforcementLevel?: EnforcementLevel): ResourceValidationPolicy {
    return {
        name: "redshift-cluster-public-access",
        description: "Checks whether Amazon Redshift clusters are not publicly accessible.",
        enforcementLevel: enforcementLevel || defaultEnforcementLevel,
        validateResource: validateTypedResource(aws.redshift.Cluster, (cluster, _, reportViolation) => {
            if (cluster.publiclyAccessible === undefined || cluster.publiclyAccessible) {
                reportViolation("Redshift cluster must not be publicly accessible.");
            }
        }),
    };
}

/** @internal */
export function dynamodbTableEncryptionEnabled(enforcementLevel?: EnforcementLevel): ResourceValidationPolicy {
    return {
        name: "dynamodb-table-encryption-enabled",
        description: "Checks whether the Amazon DynamoDB tables are encrypted.",
        enforcementLevel: enforcementLevel || defaultEnforcementLevel,
        validateResource: validateTypedResource(aws.dynamodb.Table, (table, _, reportViolation) => {
            if (table.serverSideEncryption && !table.serverSideEncryption.enabled) {
                reportViolation("DynamoDB must have server side encryption enabled.");
            }
        }),
    };
}

export interface RdsInstanceBackupEnabledArgs extends PolicyArgs {
    /** Retention period for backups. Must be greater than 0. */
    backupRetentionPeriod?: number;

    /** Time range in which backups are created. */
    preferredBackupWindow?: string;

    /** Checks whether RDS DB instances have backups enabled for read replicas. Defaults to true. */
    checkReadReplicas?: boolean;
}

/** @internal */
export function rdsInstanceBackupEnabled(
    args?: EnforcementLevel | RdsInstanceBackupEnabledArgs): ResourceValidationPolicy {

    const { enforcementLevel, backupRetentionPeriod, preferredBackupWindow, checkReadReplicas } = getValueOrDefault(args, {
        enforcementLevel: defaultEnforcementLevel,
        checkReadReplicas: true,
    });

    if (backupRetentionPeriod !== undefined && backupRetentionPeriod <= 0) {
        throw new Error("Specified retention period must be greater than 0.");
    }
    return {
        name: "rds-instance-backup-enabled",
        description: "Checks whether RDS DB instances have backups enabled. " +
            "Optionally, the rule checks the backup retention period and the backup window.",
        enforcementLevel: enforcementLevel,
        validateResource: validateTypedResource(aws.rds.Instance, (instance, _, reportViolation) => {
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

/** @internal */
export function rdsInstancePublicAccess(enforcementLevel?: EnforcementLevel): ResourceValidationPolicy {
    return {
        name: "rds-instance-public-access",
        description: "Check whether the Amazon Relational Database Service instances are not publicly accessible.",
        enforcementLevel: enforcementLevel || defaultEnforcementLevel,
        validateResource: validateTypedResource(aws.rds.Instance, (instance, _, reportViolation) => {
            if (instance.publiclyAccessible) {
                reportViolation("RDS Instance must not be publicly accessible.");
            }
        }),
    };
}

export interface RdsStorageEncryptedArgs extends PolicyArgs {
    /** KMS key ID or ARN used to encrypt the storage. */
    kmsKeyId?: string;
}

/** @internal */
export function rdsStorageEncrypted(args?: EnforcementLevel | RdsStorageEncryptedArgs): ResourceValidationPolicy {
    const { enforcementLevel, kmsKeyId } = getValueOrDefault(args, {
        enforcementLevel: defaultEnforcementLevel,
    });

    return {
        name: "rds-storage-encrypted",
        description: "Checks whether storage encryption is enabled for your RDS DB instances.",
        enforcementLevel: enforcementLevel,
        validateResource: validateTypedResource(aws.rds.Instance, (instance, _, reportViolation) => {
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
