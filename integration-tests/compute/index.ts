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
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();
const testScenario = config.getNumber("scenario");

console.log(`Running test scenario #${testScenario}`);

const vpc = new aws.ec2.Vpc('test-vpc', { });
const subnet = new aws.ec2.Subnet('test-subnet-1', {
    vpcId: vpc.id,
});
const subnet2 = new aws.ec2.Subnet('test-subnet-2', {
    vpcId: vpc.id,
});

const ami = pulumi.output(aws.ec2.getAmi({
    filters: [{
        name: "name",
        values: ["amzn2-ami-k*-hvm-*-x86_64-gp2"],
    }],
    owners: ["amazon"],
    mostRecent: true,
}));

let ec2InstanceArgs: aws.ec2.InstanceArgs = {
    ami: ami.id,
    monitoring: true,
    instanceType: "t2.micro",
    rootBlockDevice: {
        encrypted: true
    },
    ebsBlockDevices: [{
        deviceName: "/dev/test",
        encrypted: true,
    }],
};

const elbBucket = new aws.s3.Bucket("test-bucket", {
    loggings: [{
        targetBucket: "random-bucket",
    }],
});

let elbArgs: aws.elb.LoadBalancerArgs = {
    accessLogs: {
        enabled: true,
        bucket: elbBucket.arn,
    },
    subnets: [subnet.id, subnet2.id],
    listeners: [],
};

let elbV2Args: aws.lb.LoadBalancerArgs = {
    accessLogs: {
        enabled: true,
        bucket: elbBucket.arn,
    },
    subnets: [subnet.id, subnet2.id],
    enableDeletionProtection: true,
};

let albArgs: aws.alb.LoadBalancerArgs = {
    accessLogs: {
        enabled: true,
        bucket: elbBucket.arn,
    },
    subnets: [subnet.id, subnet2.id],
    enableDeletionProtection: true,
};

let sgArgs: aws.ec2.SecurityGroupArgs = {};
let sgRuleArgs: ((id: pulumi.Input<string>) => aws.ec2.SecurityGroupRuleArgs) | undefined;
let sgEgressRuleArgs: ((id: pulumi.Input<string>) => aws.vpc.SecurityGroupEgressRuleArgs) | undefined;
let sgIngressRuleArgs: ((id: pulumi.Input<string>) => aws.vpc.SecurityGroupIngressRuleArgs) | undefined;

switch (testScenario) {
    case 1:
        // Happy Path.
        break;
    case 2:
        // Monitoring is undefined.
        ec2InstanceArgs = {
            ami: ami.id,
            instanceType: "t2.micro",
            ebsBlockDevices: [{
                deviceName: "/dev/test",
                encrypted: true,
            }],
        };
        break;
    case 3:
        // Monitoring is false.
        ec2InstanceArgs = {
            ami: ami.id,
            monitoring: false,
            instanceType: "t2.micro",
            ebsBlockDevices: [{
                deviceName: "/dev/test",
                encrypted: true,
            }],
        };
        break;
    case 4:
        // Public IP is associated.
        ec2InstanceArgs = {
            ami: ami.id,
            monitoring: true,
            instanceType: "t2.micro",
            associatePublicIpAddress: true,
            ebsBlockDevices: [{
                deviceName: "/dev/test",
                encrypted: true,
            }],
        };
        break;
    case 5:
        // Elastic Load Balancers do not have access logs specified.
        elbArgs = { listeners: [] };
        elbV2Args = {
            enableDeletionProtection: true,
        };
        albArgs = {
            enableDeletionProtection: true,
        };
        break;
    case 6:
        // No EBS volume attached to EC2 instance.
        ec2InstanceArgs = {
            ami: ami.id,
            monitoring: true,
            instanceType: "t2.micro",
        };
        break;
    case 7:
        // EBS volume will not be deleted on termination and is not encrypted.
        ec2InstanceArgs = {
            ami: ami.id,
            monitoring: true,
            instanceType: "t2.micro",
            ebsBlockDevices: [{
                deviceName: "/dev/test",
                encrypted: false,
                deleteOnTermination: false,
            }],
        };
        break;
    case 8: 
        // an EBS root volume with encryption set to false.
        ec2InstanceArgs = {
            ami: ami.id,
            monitoring: true,
            instanceType: "t2.micro",
            rootBlockDevice: {
                encrypted: false
            },
            ebsBlockDevices: [{
                deviceName: "/dev/test",
                encrypted: true
            }]
        };
        break;
    case 9: 
        // No explict root volume settings defined defaulting encryption to false.
        ec2InstanceArgs = {
            ami: ami.id,
            monitoring: true,
            instanceType: "t2.micro",
            ebsBlockDevices: [{
                deviceName: "/dev/test",
                encrypted: true
            }]
        };
        break;
    case 10:
        // No SecurityGroupRule of type 'egress' for a SecurityGroup with inline egress rules.
        sgArgs = {
          egress: [{
            toPort: 80,
            fromPort: 80,
            cidrBlocks: ['0.0.0.0/0'],
            protocol: 'tcp',
          }],
        };

        sgRuleArgs = (id: pulumi.Input<string>): aws.ec2.SecurityGroupRuleArgs => {
          return {
            type: 'egress',
            protocol: 'tcp',
            cidrBlocks: ['0.0.0.0/0'],
            fromPort: 81,
            toPort: 81,
            securityGroupId: id,
          }
        }
        break;
    case 11:
        // No SecurityGroupRule of type 'ingress' for a SecurityGroup with inline ingress rules.
        sgArgs = {
          ingress: [{
            toPort: 80,
            fromPort: 80,
            cidrBlocks: ['0.0.0.0/0'],
            protocol: 'tcp',
          }],
        };

        sgRuleArgs = (id: pulumi.Input<string>): aws.ec2.SecurityGroupRuleArgs => {
          return {
            type: 'ingress',
            protocol: 'tcp',
            cidrBlocks: ['0.0.0.0/0'],
            fromPort: 81,
            toPort: 81,
            securityGroupId: id,
          }
        }
        break;
    case 12:
        // No SecurityGroupIngressRule for a SecurityGroup with inline ingress rules.
        sgArgs = {
          ingress: [{
            toPort: 80,
            fromPort: 80,
            cidrBlocks: ['0.0.0.0/0'],
            protocol: 'tcp',
          }],
        };

        sgIngressRuleArgs = (id: pulumi.Input<string>): aws.vpc.SecurityGroupIngressRuleArgs => {
          return {
            ipProtocol: 'tcp',
            cidrIpv4: '0.0.0.0/0',
            fromPort: 81,
            toPort: 81,
            securityGroupId: id,
          }
        }
        break;
    case 13:
        // No SecurityGroupEgressRule for a SecurityGroup with inline egress rules.
        sgArgs = {
          egress: [{
            toPort: 80,
            fromPort: 80,
            cidrBlocks: ['0.0.0.0/0'],
            protocol: 'tcp',
          }],
        };

        sgEgressRuleArgs = (id: pulumi.Input<string>): aws.vpc.SecurityGroupEgressRuleArgs => {
          return {
            ipProtocol: 'tcp',
            cidrIpv4: '0.0.0.0/0',
            fromPort: 81,
            toPort: 81,
            securityGroupId: id,
          }
        }
        break;
    default:
        throw new Error(`Unexpected test scenario ${testScenario}`);
}

export const ec2Instance = new aws.ec2.Instance("test-ec2-instance", ec2InstanceArgs);
export const elb = new aws.elb.LoadBalancer("test-elb", elbArgs);
export const elbV2 = new aws.lb.LoadBalancer("test-elb-v2", elbV2Args);
export const alb = new aws.alb.LoadBalancer("test-alb", albArgs);
export const sg = new aws.ec2.SecurityGroup('test-sg', sgArgs);
if (sgRuleArgs !== undefined) {
  new aws.ec2.SecurityGroupRule('test-sg-rule', sgRuleArgs(sg.id));
}
if (sgEgressRuleArgs) {
  new aws.vpc.SecurityGroupEgressRule('test-sg-egress-rule', sgEgressRuleArgs(sg.id));
}
if (sgIngressRuleArgs) {
  new aws.vpc.SecurityGroupIngressRule('test-sg-ingress-rule', sgIngressRuleArgs(sg.id));
}
