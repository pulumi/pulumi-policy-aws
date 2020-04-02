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

import { EnforcementLevel, ResourceValidationPolicy, validateResourceOfType } from "@pulumi/policy";

import { registerPolicy } from "./awsGuard";
import { PolicyArgs } from "./policyArgs";

// Mixin additional properties onto AwsGuardArgs.
declare module "./awsGuard" {
    interface AwsGuardArgs {
        redshiftClusterConfiguration?: EnforcementLevel | (RedshiftClusterConfigurationArgs & PolicyArgs);
        redshiftClusterMaintenanceSettings?: EnforcementLevel | (RedshiftClusterMaintenanceSettingsArgs & PolicyArgs);
        redshiftClusterPublicAccess?: EnforcementLevel;
        dynamodbTableEncryptionEnabled?: EnforcementLevel;
        rdsInstanceBackupEnabled?: EnforcementLevel | (RdsInstanceBackupEnabledArgs & PolicyArgs);
        rdsInstanceMultiAZEnabled?: EnforcementLevel;
        rdsInstancePublicAccess?: EnforcementLevel;
        rdsStorageEncrypted?: EnforcementLevel | (RdsStorageEncryptedArgs & PolicyArgs);
    }
}

export interface RedshiftClusterConfigurationArgs {
    /** If true, database encryption is enabled. Defaults to true. */
    clusterDbEncrypted?: boolean;

    /** If true, audit logging must be enabled. Defaults to true. */
    loggingEnabled?: boolean;

    /** List of allowed node types. */
    nodeTypes?: string[];
}

/** @internal */
export const redshiftClusterConfiguration: ResourceValidationPolicy = {
    name: "redshift-cluster-configuration",
    description: "Checks whether Amazon Redshift clusters have the specified settings.",
    configSchema: {
        properties: {
            clusterDbEncrypted: {
                type: "boolean",
                default: true,
            },
            loggingEnabled: {
                type: "boolean",
                default: true,
            },
            nodeTypes: {
                type: "array",
                items: { type: "string" },
                default: [],
            },
        },
    },
    validateResource: validateResourceOfType(aws.redshift.Cluster, (cluster, args, reportViolation) => {
        const { clusterDbEncrypted, loggingEnabled, nodeTypes } =
            args.getConfig<Required<RedshiftClusterConfigurationArgs>>();

        // Check the cluster's encryption configuration.
        if (clusterDbEncrypted && (cluster.encrypted === undefined || cluster.encrypted === false)) {
            reportViolation("Redshift cluster must be encrypted.");
        } else if (!clusterDbEncrypted && cluster.encrypted === true) {
            reportViolation("Redshift cluster must not be encrypted.");
        }

        // Check the cluster's node type.
        if (nodeTypes.length > 0 && !nodeTypes.includes(cluster.nodeType)) {
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
registerPolicy("redshiftClusterConfiguration", redshiftClusterConfiguration);

export interface RedshiftClusterMaintenanceSettingsArgs {
    /** Allow version upgrade is enabled. Defaults to true. */
    allowVersionUpgrade?: boolean;

    /** Scheduled maintenance window for clusters (for example, Mon:09:30-Mon:10:00) */
    preferredMaintenanceWindow?: string;

    /** Number of days to retain automated snapshots. */
    automatedSnapshotRetentionPeriod?: number;
}

/** @internal */
export const redshiftClusterMaintenanceSettings: ResourceValidationPolicy = {
    name: "redshift-cluster-maintenance-settings",
    description: "Checks whether Amazon Redshift clusters have the specified maintenance settings.",
    configSchema: {
        properties: {
            allowVersionUpgrade: {
                type: "boolean",
                default: true,
            },
            preferredMaintenanceWindow: {
                type: "string",
            },
            automatedSnapshotRetentionPeriod: {
                type: "number",
            },
        },
    },
    validateResource: validateResourceOfType(aws.redshift.Cluster, (cluster, args, reportViolation) => {
        const { allowVersionUpgrade, preferredMaintenanceWindow, automatedSnapshotRetentionPeriod } = args.getConfig<RedshiftClusterMaintenanceSettingsArgs>();

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
registerPolicy("redshiftClusterMaintenanceSettings", redshiftClusterMaintenanceSettings);

/** @internal */
export const redshiftClusterPublicAccess: ResourceValidationPolicy = {
    name: "redshift-cluster-public-access",
    description: "Checks whether Amazon Redshift clusters are not publicly accessible.",
    validateResource: validateResourceOfType(aws.redshift.Cluster, (cluster, _, reportViolation) => {
        if (cluster.publiclyAccessible === undefined || cluster.publiclyAccessible) {
            reportViolation("Redshift cluster must not be publicly accessible.");
        }
    }),
};
registerPolicy("redshiftClusterPublicAccess", redshiftClusterPublicAccess);


/** @internal */
export const dynamodbTableEncryptionEnabled: ResourceValidationPolicy = {
    name: "dynamodb-table-encryption-enabled",
    description: "Checks whether the Amazon DynamoDB tables are encrypted.",
    validateResource: validateResourceOfType(aws.dynamodb.Table, (table, _, reportViolation) => {
        if (table.serverSideEncryption && !table.serverSideEncryption.enabled) {
            reportViolation("DynamoDB must have server side encryption enabled.");
        }
    }),
};
registerPolicy("dynamodbTableEncryptionEnabled", dynamodbTableEncryptionEnabled);

export interface RdsInstanceBackupEnabledArgs extends PolicyArgs {
    /** Retention period for backups. Must be greater than 0. */
    backupRetentionPeriod?: number;

    /** Time range in which backups are created. */
    preferredBackupWindow?: string;

    /** Checks whether RDS DB instances have backups enabled for read replicas. Defaults to true. */
    checkReadReplicas?: boolean;
}

/** @internal */
export const rdsInstanceBackupEnabled: ResourceValidationPolicy = {
    // if (backupRetentionPeriod !== undefined && backupRetentionPeriod <= 0) {
    //     throw new Error("Specified retention period must be greater than 0.");
    // }
    name: "rds-instance-backup-enabled",
    description: "Checks whether RDS DB instances have backups enabled. " +
        "Optionally, the rule checks the backup retention period and the backup window.",
    configSchema: {
        properties: {
            backupRetentionPeriod: {
                type: "number",
                default: "666",
            },
            preferredBackupWindow: {
                type: "string",
                default: "",
            },
            checkReadReplicas: {
                type: "boolean",
                default: true,
            },
        },
    },
    validateResource: validateResourceOfType(aws.rds.Instance, (instance, args, reportViolation) => {
        const { backupRetentionPeriod, preferredBackupWindow, checkReadReplicas } = args.getConfig<Required<RdsInstanceBackupEnabledArgs>>();
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
                    reportViolation(`RDS Instances must have a backup preferred back up window of: ${
                        preferredBackupWindow}.`);
                }
            }
        }
    }),
};
registerPolicy("rdsInstanceBackupEnabled", rdsInstanceBackupEnabled);


/** @internal */
export const rdsInstanceMultiAZEnabled: ResourceValidationPolicy = {
    name: "rds-instance-multi-az-enabled",
    description: "Check whether high availability is enabled for Amazon Relational Database Service instances.",
    validateResource: validateResourceOfType(aws.rds.Instance, (instance, _, reportViolation) => {
        if (instance.multiAz === undefined || instance.multiAz === false) {
            reportViolation("RDS Instances must be configured with multiple AZs for highly available.");
        }
    }),
};
registerPolicy("rdsInstanceMultiAZEnabled", rdsInstanceMultiAZEnabled);


/** @internal */
export const rdsInstancePublicAccess: ResourceValidationPolicy = {
    name: "rds-instance-public-access",
    description: "Check whether the Amazon Relational Database Service instances are not publicly accessible.",
    validateResource: validateResourceOfType(aws.rds.Instance, (instance, _, reportViolation) => {
        if (instance.publiclyAccessible) {
            reportViolation("RDS Instance must not be publicly accessible.");
        }
    }),
};
registerPolicy("rdsInstancePublicAccess", rdsInstancePublicAccess);


export interface RdsStorageEncryptedArgs extends PolicyArgs {
    /** KMS key ID or ARN used to encrypt the storage. */
    kmsKeyId?: string;
}

/** @internal */
export const rdsStorageEncrypted: ResourceValidationPolicy = {
    name: "rds-storage-encrypted",
    description: "Checks whether storage encryption is enabled for your RDS DB instances.",
    configSchema: {
        properties: {
            kmsKeyId: {
                type: "string",
                default: "",
            },
        },
    },
    validateResource: validateResourceOfType(aws.rds.Instance, (instance, args, reportViolation) => {
        const { kmsKeyId } = args.getConfig<Required<RdsStorageEncryptedArgs>>();
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
registerPolicy("rdsStorageEncrypted", rdsStorageEncrypted);
