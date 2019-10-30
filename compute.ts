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
import { EnforcementLevel, Policy, typedRule } from "@pulumi/policy";

import * as assert from "assert";

export const compute: Policy[] = [
    Ec2InstanceDetailedMonitoringEnabled("mandatory"),
    Ec2InstanceNoPublicIP("mandatory"),
    Ec2VolumeInUseCheck("mandatory", true),
    ElbAccessLoggingEnabled("mandatory"),
    ElbAccessLoggingEnabled("mandatory"),
    EncryptedVolumes("mandatory"),
];

export function Ec2InstanceDetailedMonitoringEnabled(enforcementLevel: EnforcementLevel = "advisory"): Policy {
    return {
        name: "ec2-instance-detailed-monitoring-enabled",
        description: "Checks whether detailed monitoring is enabled for EC2 instances.",
        enforcementLevel: enforcementLevel,
        rules: [
            typedRule(aws.ec2.Instance.isInstance, it => assert.ok(it.monitoring,
                "You should enable detailed monitoring on EC2 instances.")),
        ],
    };
}

export function Ec2InstanceNoPublicIP(enforcementLevel: EnforcementLevel = "advisory"): Policy {
    return {
        name: "ec2-instance-no-public-ip",
        description: "Checks whether Amazon EC2 instances have a public IP association. " +
            "This rule applies only to IPv4.",
        enforcementLevel: enforcementLevel,
        rules: [
            typedRule(aws.ec2.Instance.isInstance, it => assert.ok(!it.associatePublicIpAddress,
                "An EC2 instance should not have a public IP associated with it.")),
        ],
    };
}

function Ec2VolumeInUseCheck(enforcementLevel: EnforcementLevel = "advisory", checkDeletion: boolean): Policy {
    return {
        name: "ec2-volume-inuse-check",
        description: "Checks whether EBS volumes are attached to EC2 instances. " +
            "Optionally checks if EBS volumes are marked for deletion when an instance is terminated.",
        enforcementLevel: enforcementLevel,
        rules: [
            typedRule(aws.ec2.Instance.isInstance, it => {
                assert.ok(it.ebsBlockDevices && it.ebsBlockDevices.length > 0,
                    "EC2 instance has no EBS volumes attached.");

                if (checkDeletion) {
                    for (const vol of it.ebsBlockDevices) {
                        assert.ok(vol.deleteOnTermination && vol.deleteOnTermination === true,
                            "ECS instance has an EBS volume that is not marked for termination on delete.");
                    }
                }
            }),
        ],
    };
}

export function ElbAccessLoggingEnabled(enforcementLevel: EnforcementLevel = "advisory"): Policy {
    return {
        name: "elb-logging-enabled",
        description: "Checks whether the Application Load Balancers and the Classic Load Balancers have logging enabled.",
        enforcementLevel: enforcementLevel,
        rules: [
            typedRule(aws.elasticloadbalancing.LoadBalancer.isInstance,
                it => assert.ok(it.accessLogs && it.accessLogs.enabled, "An ELB should have access logs enabled.")),
            typedRule(aws.elasticloadbalancingv2.LoadBalancer.isInstance,
                it => assert.ok(it.accessLogs && it.accessLogs.enabled, "An ELB should have access logs enabled.")),
            typedRule(aws.applicationloadbalancing.LoadBalancer.isInstance,
                it => assert.ok(it.accessLogs && it.accessLogs.enabled, "An ALB should have access logs enabled.")),
        ],
    };
}

export function EncryptedVolumes(enforcementLevel: EnforcementLevel = "advisory", kmsId?: string): Policy {
    return {
        name: "encrypted-volumes",
        description: "Checks whether the EBS volumes that are in an attached state are encrypted. " +
            "If you specify the ID of a KMS key for encryption using the kmsId parameter, " +
            "the rule checks if the EBS volumes in an attached state are encrypted with that KMS key.",
        enforcementLevel: enforcementLevel,
        rules: [
            typedRule(aws.ec2.Instance.isInstance,
                it => {
                    if (it.ebsBlockDevices && it.ebsBlockDevices.length > 0) {
                        for (const ebs of it.ebsBlockDevices) {
                            assert.ok(ebs.encrypted, "EBS volumes should be encrypted.");
                            if (kmsId) {
                                assert.ok(ebs.kmsKeyId === kmsId, "EBS volume not encrypted with required key.");
                            }
                        }
                    }
                }),
        ],
    };
}
