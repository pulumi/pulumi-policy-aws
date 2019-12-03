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
        ec2InstanceDetailedMonitoringEnabled?: EnforcementLevel;
        ec2InstanceNoPublicIP?: EnforcementLevel;
        ec2VolumeInUse?: EnforcementLevel | Ec2VolumeInUseArgs;
        elbAccessLoggingEnabled?: EnforcementLevel;
        encryptedVolumes?: EnforcementLevel | EncryptedVolumesArgs;
    }
}

// Register policy factories.
registerPolicy("ec2InstanceDetailedMonitoringEnabled", ec2InstanceDetailedMonitoringEnabled);
registerPolicy("ec2InstanceNoPublicIP", ec2InstanceNoPublicIP);
registerPolicy("ec2VolumeInUse", ec2VolumeInUse);
registerPolicy("elbAccessLoggingEnabled", elbAccessLoggingEnabled);
registerPolicy("encryptedVolumes", encryptedVolumes);


/** @internal */
export function ec2InstanceDetailedMonitoringEnabled(enforcementLevel?: EnforcementLevel): ResourceValidationPolicy {
    return {
        name: "ec2-instance-detailed-monitoring-enabled",
        description: "Checks whether detailed monitoring is enabled for EC2 instances.",
        enforcementLevel: enforcementLevel || defaultEnforcementLevel,
        validateResource: validateTypedResource(aws.ec2.Instance, (instance, _, reportViolation) => {
            if (!instance.monitoring) {
                reportViolation("EC2 instances must have detailed monitoring enabled.");
            }
        }),
    };
}

/** @internal */
export function ec2InstanceNoPublicIP(enforcementLevel?: EnforcementLevel): ResourceValidationPolicy {
    return {
        name: "ec2-instance-no-public-ip",
        description: "Checks whether Amazon EC2 instances have a public IP association. " +
            "This rule applies only to IPv4.",
        enforcementLevel: enforcementLevel || defaultEnforcementLevel,
        validateResource: validateTypedResource(aws.ec2.Instance, (instance, _, reportViolation) => {
            if (instance.associatePublicIpAddress) {
                reportViolation("EC2 instance must not have a public IP.");
            }
        }),
    };
}

export interface Ec2VolumeInUseArgs extends PolicyArgs {
    checkDeletion?: boolean;
}

/** @internal */
export function ec2VolumeInUse(args?: EnforcementLevel | Ec2VolumeInUseArgs): ResourceValidationPolicy {
    const { enforcementLevel, checkDeletion } = getValueOrDefault(args, {
        enforcementLevel: defaultEnforcementLevel,
        checkDeletion: true,
    });

    return {
        name: "ec2-volume-inuse",
        description: "Checks whether EBS volumes are attached to EC2 instances. " +
            "Optionally checks if EBS volumes are marked for deletion when an instance is terminated.",
        enforcementLevel: enforcementLevel,
        validateResource: validateTypedResource(aws.ec2.Instance, (instance, _, reportViolation) => {
            if (!instance.ebsBlockDevices || instance.ebsBlockDevices.length === 0) {
                reportViolation("EC2 instance must have an EBS volume attached.");
            }

            if (checkDeletion) {
                for (const vol of instance.ebsBlockDevices || []) {
                    if (vol.deleteOnTermination === undefined || vol.deleteOnTermination === false) {
                        reportViolation(`ECS instance's EBS volume (${vol.volumeId}) must be marked for termination on delete.`);
                    }
                }
            }
        }),
    };
}

/** @internal */
export function elbAccessLoggingEnabled(enforcementLevel?: EnforcementLevel): ResourceValidationPolicy {
    return {
        name: "elb-logging-enabled",
        description: "Checks whether the Application Load Balancers and the Classic Load Balancers have logging enabled.",
        enforcementLevel: enforcementLevel || defaultEnforcementLevel,
        validateResource: [
            validateTypedResource(aws.elasticloadbalancing.LoadBalancer, (loadBalancer, args, reportViolation) => {
                if (loadBalancer.accessLogs === undefined || !loadBalancer.accessLogs.enabled) {
                    reportViolation("Elastic Load Balancer must have access logs enabled.");
                }
            }),
            validateTypedResource(aws.elasticloadbalancingv2.LoadBalancer, (loadBalancer, args, reportViolation) => {
                if (loadBalancer.accessLogs === undefined || !loadBalancer.accessLogs.enabled) {
                    reportViolation("Elastic Load Balancer must have access logs enabled.");
                }
            }),
            validateTypedResource(aws.applicationloadbalancing.LoadBalancer, (loadBalancer, args, reportViolation) => {
                if (loadBalancer.accessLogs === undefined || !loadBalancer.accessLogs.enabled) {
                    reportViolation("Application Load Balancer must have access logs enabled.");
                }
            }),
        ],
    };
}

export interface EncryptedVolumesArgs extends PolicyArgs {
    kmsId?: string;
}

/** @internal */
export function encryptedVolumes(args?: EnforcementLevel | EncryptedVolumesArgs): ResourceValidationPolicy {
    const { enforcementLevel, kmsId } = getValueOrDefault(args, {
        enforcementLevel: defaultEnforcementLevel,
        kmsId: undefined,
    });

    return {
        name: "encrypted-volumes",
        description: "Checks whether the EBS volumes that are in an attached state are encrypted. " +
            "If you specify the ID of a KMS key for encryption using the kmsId parameter, " +
            "the rule checks if the EBS volumes in an attached state are encrypted with that KMS key.",
        enforcementLevel: enforcementLevel,
        validateResource: validateTypedResource(aws.ec2.Instance, (instance, _, reportViolation) => {
            if (instance.ebsBlockDevices && instance.ebsBlockDevices.length > 0) {
                for (const ebs of instance.ebsBlockDevices) {
                    if (!ebs.encrypted) {
                        reportViolation(`EBS volume (${ebs.volumeId}) must be encrypted.`);
                    }
                    if (kmsId && ebs.kmsKeyId !== kmsId) {
                        reportViolation(`EBS volume (${ebs.volumeId}) must be encrypted with required key: ${kmsId}.`);
                    }
                }
            }
        }),
    };
}
