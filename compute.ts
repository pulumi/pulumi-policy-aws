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
import { typedRule, EnforcementLevel, Policy } from "@pulumi/policy";

import * as assert from "assert";

function Ec2InstanceDetailedMonitoringEnabled(enforcementLevel: EnforcementLevel = "advisory"): Policy {
    return {
        name: "ec2-instance-detailed-monitoring-enabled",
        description: "Checks whether detailed monitoring is enabled for EC2 instances.",
        enforcementLevel: enforcementLevel,
        rules: [
            typedRule(aws.ec2.Instance.isInstance, it => assert.ok(it.monitoring,
                "You should enable detailed monitoring on EC2 instances.")),
        ],
    }
}

// TODO
// function Ec2InstanceManagedBySystemsManager(enforcementLevel: EnforcementLevel = "advisory"): Policy {
//     return {
//         name: "ec2-instance-managed-by-systems-manager",
//         description: "Checks whether the Amazon EC2 instances in your account are managed by AWS Systems Manager.",
//         enforcementLevel: enforcementLevel,
//         rules: [
//             typedRule(aws.ec2.Instance.isInstance, it => assert.ok(it.monitoring,
//                 "You should enable detailed monitoring on EC2 instances.")),
//         ],
//     }
// }

function Ec2InstanceNoPublicIP(enforcementLevel: EnforcementLevel = "advisory"): Policy {
    return {
        name: "ec2-instance-no-public-ip",
        description: "Checks whether Amazon EC2 instances have a public IP association. " +
            "This rule applies only to IPv4.",
        enforcementLevel: enforcementLevel,
        rules: [
            typedRule(aws.ec2.Instance.isInstance, it => assert.ok(!it.associatePublicIpAddress,
                "An EC2 instance should not have a public IP associated with it.")),
        ],
    }
}

// TODO
// function Ec2InstancesInVpc(enforcementLevel: EnforcementLevel = "advisory"): Policy {
//     return {
//         name: "ec2-instances-in-vpc",
//         description: "Checks whether your EC2 instances belong to a virtual private cloud (VPC).",
//         enforcementLevel: enforcementLevel,
//         rules: [
//             typedRule(aws.ec2.Instance.isInstance, it => assert.ok(!it.associatePublicIpAddress,
//                 "An EC2 instance should not have a public IP associated with it.")),
//         ],
//     }
// }

// TODO
// function Ec2ManagedInstanceApplicationsBlacklisted(enforcementLevel: EnforcementLevel = "advisory"): Policy {
//     return {
//         name: "ec2-managedinstance-applications-blacklisted",
//         description: "Checks that none of the specified applications are installed on the instance. " +
//             "Optionally, specify the application version. Newer versions of the application will not be blacklisted. " +
//             "You can also specify the platform to apply the rule only to instances running that platform..",
//         enforcementLevel: enforcementLevel,
//         rules: [
//             typedRule(aws.ssm., it => assert.ok(!it.associatePublicIpAddress,
//                 "An EC2 instance should not have a public IP associated with it.")),
//         ],
//     }
// }

// TODO
// function Ec2InstanceGroupAttachedToEni(enforcementLevel: EnforcementLevel = "advisory"): Policy {
//     return {
//         name: "ec2-security-group-attached-to-eni",
//         description: "Checks that security groups are attached to Amazon EC2 instances or to an elastic network interface.",
//         enforcementLevel: enforcementLevel,
//         rules: [
//             typedRule(aws.ec2.Instance.isInstance, it => assert.ok(((it.securityGroups && it.securityGroups.length > 0)
//                 || (it.networkInterfaces && it.networkInterfaces.length > 0))),
//         ],
//     }
// }

// TODO
// function Ec2VolumeInUseCheck(enforcementLevel: EnforcementLevel = "advisory", checkDeletion: boolean): Policy {
//     return {
//         name: "ec2-volume-inuse-check",
//         description: "Checks whether EBS volumes are attached to EC2 instances. " +
//             "Optionally checks if EBS volumes are marked for deletion when an instance is terminated.",
//         enforcementLevel: enforcementLevel,
//         rules: [
//             typedRule(aws.ec2.Instance.isInstance, it => assert.ok(
//                 it.ebsBlockDevices && it.ebsBlockDevices.length > 0,
//                 "EC2 instance has no EBS volumes attached.")),
//             typedRule(aws.ec2.Instance.isInstance, it => assert.ok(it => {
//                 if (!checkDeletion) {
//                     return true;
//                 }
//                 for (const vol of it.ebsBlockDevices) {
//                     if (vol.deleteOnTermination) {

//                     }
//                 }
//             })),
//         ],
//     }
// }

// Cant do
// function EipAttached(enforcementLevel: EnforcementLevel = "advisory"): Policy {
//     return {
//         name: "eip-attached",
//         description: "Checks whether all Elastic IP addresses that are allocated to a VPC are attached to EC2 instances or in-use elastic network interfaces (ENIs). Results might take up to 6 hours to become available after an evaluation occurs.",
//         enforcementLevel: enforcementLevel,
//         rules: [
//             typedRule(aws.ec2.Instance.isInstance, it => assert.ok(!it.associatePublicIpAddress,
//                 "An EC2 instance should not have a public IP associated with it.")),
//         ],
//     }
// }

// TODO: This isn't quite right. We need to get the ID and make sure its from ACM. 
// Also if it is set this is only valid when the lbProtocol is HTTPS or SSL, so we will
// want to check that as well.
function ElbAcmCertificateRequired(enforcementLevel: EnforcementLevel = "advisory"): Policy {
    return {
        name: "elb-acm-certificate-required",
        description: "Checks whether the Classic Load Balancers use SSL certificates provided by AWS Certificate Manager. " +
            "To use this rule, use an SSL or HTTPS listener with your Classic Load Balancer. " +
            "This rule is only applicable to Classic Load Balancers." +
            "This rule does not check Application Load Balancers and Network Load Balancers.",
        enforcementLevel: enforcementLevel,
        rules: [
            typedRule(aws.elasticloadbalancing.LoadBalancer.isInstance, it => {
                for (const listener of it.listeners) {
                    assert.ok(listener.sslCertificateId);
                }
            }),
        ],
    }
}

function ElbAccessLoggingEnabled(enforcementLevel: EnforcementLevel = "advisory"): Policy {
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
    }
}

// CANT DO -- this requires we are able to get a `LoadBalancerPolicy` and `LoadBalancer`
// function ElbPredefinedSecurityPolicySSLCheck(enforcementLevel: EnforcementLevel = "advisory", predefinedPolicyName: string): Policy {
//     return {
//         name: "elb-predefined-security-policy-ssl-check",
//         description: "Checks whether your Classic Load Balancer SSL listeners are using a predefined policy. " +
//             "The rule is only applicable if there are SSL listeners for the Classic Load Balancer.",
//         enforcementLevel: enforcementLevel,
//         rules: [
//             typedRule(aws.elasticloadbalancing.LoadBalancer.isInstance, it => {
                
//                 for (const listener of it.listeners) {
//                     if (listener.lbProtocol && listener.lbProtocol == "SSL") {
//                     }
//                 }
//             }),
//             typedRule(aws.elasticloadbalancingv2.LoadBalancer.isInstance,
//                 it => assert.ok(it.accessLogs && it.accessLogs.enabled, "An ELB should have access logs enabled.")),
//         ],
//     }
// }

function EncryptedVolumes(enforcementLevel: EnforcementLevel = "advisory", kmsId?: string): Policy {
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
                            assert.ok(ebs.encrypted, "EBS volumes should be encrypted.")
                            if (kmsId) {
                                assert.ok(ebs.kmsKeyId === kmsId, "EBS volume not encrypted with required key.")
                            }
                        }
                    }
                }),
        ],
    }
}