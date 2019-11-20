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

// ComputePolicySettings defines the configuration parameters for any individual Compute policies
// that can be configured individually. If not provided, will default to a reasonable value
// from the AWS Guard module.
export interface ComputePolicySettings {
    // For ec2VolumneInUseCheck policy:
    // Check if the the EC2 instance is marked for deletion is terminated as well.
    ec2VolumneInUseCheckForDeletion?: boolean;
}

// getPolicies returns all Compute policies.
export function getPolicies(
    enforcement: EnforcementLevel, settings: ComputePolicySettings): Policies {

    const checkForDeletion = getValueOrDefault(settings.ec2VolumneInUseCheckForDeletion, true);
    return  [
        ec2InstanceDetailedMonitoringEnabled(enforcement),
        ec2InstanceNoPublicIP(enforcement),
        ec2VolumeInUseCheck(enforcement, checkForDeletion),
        elbAccessLoggingEnabled(enforcement),
        encryptedVolumes(enforcement),
    ];
}

export function ec2InstanceDetailedMonitoringEnabled(enforcementLevel: EnforcementLevel = "advisory"): ResourceValidationPolicy {
    return {
        name: "ec2-instance-detailed-monitoring-enabled",
        description: "Checks whether detailed monitoring is enabled for EC2 instances.",
        enforcementLevel: enforcementLevel,
        validateResource: validateTypedResource(aws.ec2.Instance, (instance, args, reportViolation) => {
            if (!instance.monitoring) {
                reportViolation("EC2 instances must have detailed monitoring enabled.");
            }
        }),
    };
}

export function ec2InstanceNoPublicIP(enforcementLevel: EnforcementLevel = "advisory"): ResourceValidationPolicy {
    return {
        name: "ec2-instance-no-public-ip",
        description: "Checks whether Amazon EC2 instances have a public IP association. " +
            "This rule applies only to IPv4.",
        enforcementLevel: enforcementLevel,
        validateResource: validateTypedResource(aws.ec2.Instance, (instance, args, reportViolation) => {
            if (instance.associatePublicIpAddress) {
                reportViolation("EC2 instance must not have a public IP.");
            }
        }),
    };
}

function ec2VolumeInUseCheck(enforcementLevel: EnforcementLevel = "advisory", checkDeletion: boolean): ResourceValidationPolicy {
    return {
        name: "ec2-volume-inuse-check",
        description: "Checks whether EBS volumes are attached to EC2 instances. " +
            "Optionally checks if EBS volumes are marked for deletion when an instance is terminated.",
        enforcementLevel: enforcementLevel,
        validateResource: validateTypedResource(aws.ec2.Instance, (instance, args, reportViolation) => {
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

export function elbAccessLoggingEnabled(enforcementLevel: EnforcementLevel = "advisory"): ResourceValidationPolicy {
    return {
        name: "elb-logging-enabled",
        description: "Checks whether the Application Load Balancers and the Classic Load Balancers have logging enabled.",
        enforcementLevel: enforcementLevel,
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

export function encryptedVolumes(enforcementLevel: EnforcementLevel = "advisory", kmsId?: string): ResourceValidationPolicy {
    return {
        name: "encrypted-volumes",
        description: "Checks whether the EBS volumes that are in an attached state are encrypted. " +
            "If you specify the ID of a KMS key for encryption using the kmsId parameter, " +
            "the rule checks if the EBS volumes in an attached state are encrypted with that KMS key.",
        enforcementLevel: enforcementLevel,
        validateResource: validateTypedResource(aws.ec2.Instance, (instance, args, reportViolation) => {
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
