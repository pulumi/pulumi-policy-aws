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
import { EnforcementLevel, Policies, ResourceValidationPolicy, validateTypedResource } from "@pulumi/policy";

import { getValueOrDefault } from "./util";

// DatabasePolicySettings defines the configuration parameters for any individual Database policies
// that can be configured individually. If not provided, will default to a reasonable value
// from the AWS Guard module.
export interface DatabasePolicySettings {
    // For redshiftClusterConfigurationCheck policy:
    // Checks if the cluster is or is not encrypted.
    redshiftClusterConfigurationCheckClusterEncrypted?: boolean;
    // Check if logging is or is not enabled.
    redshiftClusterConfigurationCheckLoggingEnabled?: boolean;

    // For redshiftClusterMaintenanceSettingsCheck policy:
    // Check if the cluster does or does not check for version upgrades.
    clusterMaintenanceSettingsCheckAllowVersionUpgrade?: boolean;
}

// getPolicies returns all Compute policies.
export function getPolicies(
    enforcement: EnforcementLevel, settings: DatabasePolicySettings): Policies {

    const clusterEncrypted = getValueOrDefault(settings.redshiftClusterConfigurationCheckClusterEncrypted, true);
    const loggingEnabled = getValueOrDefault(settings.redshiftClusterConfigurationCheckLoggingEnabled, true);
    const allowVersionUpgrade = getValueOrDefault(settings.clusterMaintenanceSettingsCheckAllowVersionUpgrade, true);
    return [
        redshiftClusterConfigurationCheck(enforcement, clusterEncrypted, loggingEnabled),
        redshiftClusterMaintenanceSettingsCheck(enforcement, allowVersionUpgrade),
        redshiftClusterPublicAccessCheck(enforcement),
    ];
}

/**
 *
 * @param enforcementLevel The enforcement level to enforce this policy with.
 * @param clusterDbEncrypted If true, database encryption is enabled. Defaults to true.
 * @param loggingEnabled If true, audit logging must be enabled. Defaults to true.
 * @param nodeTypes Optional. List of allowed node types.
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
 * @param enforcementLevel The enforcement level to enforce this policy with.
 * @param allowVersionUpgrade Allow version upgrade is enabled. Defaults to true.
 * @param preferredMaintenanceWindow Optional. Scheduled maintenance window for clusters (for example, Mon:09:30-Mon:10:00).
 * @param automatedSnapshotRetentionPeriod Optional. Number of days to retain automated snapshots.
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
