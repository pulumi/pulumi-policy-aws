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

const ami = pulumi.output(aws.ec2.getAmi({
    filters: [{
        name: "name",
        values: ["amzn-ami-hvm-*"],
    }],
    owners: ["137112412989"], // This owner ID is Amazon
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
    listeners: [],
};

let elbV2Args: aws.lb.LoadBalancerArgs = {
    accessLogs: {
        enabled: true,
        bucket: elbBucket.arn,
    },
    enableDeletionProtection: true,
};

let albArgs: aws.alb.LoadBalancerArgs = {
    accessLogs: {
        enabled: true,
        bucket: elbBucket.arn,
    },
    enableDeletionProtection: true,
};

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
    default:
        throw new Error(`Unexpected test scenario ${testScenario}`);
}

export const ec2Instance = new aws.ec2.Instance("test-ec2-instance", ec2InstanceArgs);
export const elb = new aws.elb.LoadBalancer("test-elb", elbArgs);
export const elbV2 = new aws.lb.LoadBalancer("test-elb-v2", elbV2Args);
export const alb = new aws.alb.LoadBalancer("test-alb", albArgs);
