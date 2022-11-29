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

import {
    EnforcementLevel,
    ResourceValidationPolicy,
    validateResourceOfType,
} from "@pulumi/policy";

import { registerPolicy } from "./awsGuard";
import { PolicyArgs } from "./policyArgs";

// Mixin additional properties onto AwsGuardArgs.
declare module "./awsGuard" {
    interface AwsGuardArgs {
        ec2InstanceDetailedMonitoringEnabled?: EnforcementLevel;
        ec2InstanceNoPublicIP?: EnforcementLevel;
        ec2VolumeInUse?: EnforcementLevel | (Ec2VolumeInUseArgs & PolicyArgs);
        elbAccessLoggingEnabled?: EnforcementLevel;
        encryptedVolumes?:
        | EnforcementLevel
        | (EncryptedVolumesArgs & PolicyArgs);
        amiByIds?: EnforcementLevel | (AmiByIdArgs & PolicyArgs);
    }
}

/** @internal */
export const ec2InstanceDetailedMonitoringEnabled: ResourceValidationPolicy = {
    name: "ec2-instance-detailed-monitoring-enabled",
    description:
        "Checks whether detailed monitoring is enabled for EC2 instances.",
    validateResource: validateResourceOfType(
        aws.ec2.Instance,
        (instance, _, reportViolation) => {
            if (!instance.monitoring) {
                reportViolation(
                    "EC2 instances must have detailed monitoring enabled.",
                );
            }
        },
    ),
};
registerPolicy(
    "ec2InstanceDetailedMonitoringEnabled",
    ec2InstanceDetailedMonitoringEnabled,
);

/** @internal */
export const ec2InstanceNoPublicIP: ResourceValidationPolicy = {
    name: "ec2-instance-no-public-ip",
    description:
        "Checks whether Amazon EC2 instances have a public IP association. This rule applies only to IPv4.",
    validateResource: validateResourceOfType(
        aws.ec2.Instance,
        (instance, _, reportViolation) => {
            if (instance.associatePublicIpAddress) {
                reportViolation("EC2 instance must not have a public IP.");
            }
        },
    ),
};
registerPolicy("ec2InstanceNoPublicIP", ec2InstanceNoPublicIP);

export interface Ec2VolumeInUseArgs {
    checkDeletion?: boolean;
}

/** @internal */
export const ec2VolumeInUse: ResourceValidationPolicy = {
    name: "ec2-volume-inuse",
    description:
        "Checks whether EBS volumes are attached to EC2 instances. " +
        "Optionally checks if EBS volumes are marked for deletion when an instance is terminated.",
    configSchema: {
        properties: {
            checkDeletion: {
                type: "boolean",
                default: true,
            },
        },
    },
    validateResource: validateResourceOfType(
        aws.ec2.Instance,
        (instance, args, reportViolation) => {
            const { checkDeletion } =
                args.getConfig<Required<Ec2VolumeInUseArgs>>();

            if (
                !instance.ebsBlockDevices ||
                instance.ebsBlockDevices.length === 0
            ) {
                reportViolation(
                    "EC2 instance must have an EBS volume attached.",
                );
            }

            if (checkDeletion) {
                for (const vol of instance.ebsBlockDevices || []) {
                    if (
                        vol.deleteOnTermination === undefined ||
                        vol.deleteOnTermination === false
                    ) {
                        reportViolation(
                            `ECS instance's EBS volume (${vol.volumeId}) must be marked for termination on delete.`,
                        );
                    }
                }
            }
        },
    ),
};
registerPolicy("ec2VolumeInUse", ec2VolumeInUse);

/** @internal */
export const elbAccessLoggingEnabled: ResourceValidationPolicy = {
    name: "elb-logging-enabled",
    description:
        "Checks whether the Application Load Balancers and the Classic Load Balancers have logging enabled.",
    validateResource: [
        validateResourceOfType(aws.elasticloadbalancing.LoadBalancer, (loadBalancer, args, reportViolation) => {
            if (loadBalancer.accessLogs === undefined || !loadBalancer.accessLogs.enabled) {
                reportViolation("Elastic Load Balancer must have access logs enabled.");
            }
        }),
        validateResourceOfType(aws.elasticloadbalancingv2.LoadBalancer, (loadBalancer, args, reportViolation) => {
            if (loadBalancer.accessLogs === undefined || !loadBalancer.accessLogs.enabled) {
                reportViolation("Elastic Load Balancer must have access logs enabled.");
            }
        }),
        validateResourceOfType(aws.applicationloadbalancing.LoadBalancer, (loadBalancer, args, reportViolation) => {
            if (loadBalancer.accessLogs === undefined || !loadBalancer.accessLogs.enabled) {
                reportViolation("Elastic Load Balancer must have access logs enabled.");
            }
        }),
        validateResourceOfType(aws.lb.LoadBalancer, (loadBalancer, args, reportViolation) => {
            if (loadBalancer.accessLogs === undefined || !loadBalancer.accessLogs.enabled) {
                reportViolation("Elastic Load Balancer must have access logs enabled.");
            }
        }),
        validateResourceOfType(aws.alb.LoadBalancer, (loadBalancer, args, reportViolation) => {
            if (loadBalancer.accessLogs === undefined || !loadBalancer.accessLogs.enabled) {
                reportViolation("Elastic Load Balancer must have access logs enabled.");
            }
        }),
    ],
};
registerPolicy("elbAccessLoggingEnabled", elbAccessLoggingEnabled);

export interface EncryptedVolumesArgs {
    kmsId?: string;
}

/** @internal */
export const encryptedVolumes: ResourceValidationPolicy = {
    name: "encrypted-volumes",
    description:
        "Checks whether the EBS volumes that are in an attached state are encrypted. " +
        "If you specify the ID of a KMS key for encryption using the kmsId parameter, " +
        "the rule checks if the EBS volumes in an attached state are encrypted with that KMS key.",
    configSchema: {
        properties: {
            kmsId: { type: "string" },
        },
    },
    validateResource: validateResourceOfType(
        aws.ec2.Instance,
        (instance, args, reportViolation) => {
            const { kmsId } = args.getConfig<EncryptedVolumesArgs>();

            if (!instance.rootBlockDevice) {
                reportViolation(
                    "The EC2 instance root block device must be encrypted.",
                );
            }

            if (instance.rootBlockDevice) {
                const rootBlockDevice = instance.rootBlockDevice;
                if (!rootBlockDevice.encrypted) {
                    reportViolation(
                        "The EC2 instance root block device must be encrypted.",
                    );
                }
                if (kmsId && rootBlockDevice.kmsKeyId !== kmsId) {
                    reportViolation(
                        `The EC2 instance root block device must be encrypted with required key: ${kmsId}.`,
                    );
                }
            }

            if (
                instance.ebsBlockDevices &&
                instance.ebsBlockDevices.length > 0
            ) {
                for (const ebs of instance.ebsBlockDevices) {
                    if (!ebs.encrypted) {
                        reportViolation(
                            `EBS volume (${ebs.volumeId}) must be encrypted.`,
                        );
                    }
                    if (kmsId && ebs.kmsKeyId !== kmsId) {
                        reportViolation(
                            `EBS volume (${ebs.volumeId}) must be encrypted with required key: ${kmsId}.`,
                        );
                    }
                }
            }
        },
    ),
};
registerPolicy("encryptedVolumes", encryptedVolumes);

export interface AmiByIdArgs {
    AmiIds: string[];
}

/** @internal */
export const amiByIds: ResourceValidationPolicy = {
    name: "ami-by-ids",
    description:
        "Checks thru instances and launch templates to validate users are using approved amis",
    configSchema: {
        properties: {
            AmiIds: { type: "array", items: { type: "string" }, default: [] },
        },
    },
    validateResource: [
        validateResourceOfType(
            aws.ec2.Instance,
            (instance, args, reportViolation) => {
                const { AmiIds } = args.getConfig<AmiByIdArgs>();
                if (AmiIds && AmiIds.length > 0) {
                    if (instance.ami) {
                        if (!AmiIds.includes(instance.ami)) {
                            reportViolation(
                                `EC2 Instance is using Ami:(${instance.ami}), should use approved AMIs.`,
                            );
                        }
                    }
                }
            },
        ),
        validateResourceOfType(
            aws.ec2.LaunchConfiguration,
            (lc, args, reportViolation) => {
                const { AmiIds } = args.getConfig<AmiByIdArgs>();
                if (AmiIds && AmiIds.length > 0) {
                    if (AmiIds && !AmiIds.includes(lc.imageId)) {
                        reportViolation(
                            `EC2 LaunchConfiguration is using Ami:(${lc.imageId}), should use approved AMIs.`,
                        );
                    }
                }
            },
        ),
        validateResourceOfType(
            aws.ec2.LaunchTemplate,
            (lt, args, reportViolation) => {
                const { AmiIds } = args.getConfig<AmiByIdArgs>();
                if (AmiIds && AmiIds.length > 0) {
                    if (AmiIds && lt.imageId && !AmiIds.includes(lt.imageId)) {
                        reportViolation(
                            `EC2 LaunchTemplate is using Ami:(${lt.imageId}), should use approved AMIs.`,
                        );
                    }
                }
            },
        ),
    ],
};
registerPolicy("amiByIds", amiByIds);
