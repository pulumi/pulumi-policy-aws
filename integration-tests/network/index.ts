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

import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

import * as os from "os";

const config = new pulumi.Config();
const testScenario = config.getNumber("scenario");

// Construct the ALB and a target group to receive all traffic.
// We create an HTTPS listener. The HTTP listener is created later,
// depending on the test scenario.

const httpPort = 80;
const httpsPort = 443;

// S3 bucket for storing the ALB's access logs. Once we have support for disabling some AWSGuard rules
// when running integration tests, we should no longer require creating this resource.
const testBucketName = `awsguard-test-${pulumi.getStack()}-logs`;

const accessLogsBucket = new aws.s3.Bucket("accessLogs", {
    bucket: testBucketName,
    loggings: [{
        targetBucket: testBucketName,  // Write access logs into itself.
    }],
});

const alb = new aws.alb.LoadBalancer(
    "alb",
    {
        // Required for AWS guard rules, but makes it impossible to delete.
        enableDeletionProtection: true,

        subnets: [],
        securityGroups: [],
        internal: false,
        idleTimeout: 120,
        // We don't really want to enable access logs, but would cause
        // some other AWS guard policies to fail.
        accessLogs: {
            enabled: true,
            bucket: accessLogsBucket.id,
        },
    });

const defaultVpc = awsx.ec2.Vpc.getDefault();

const testTargetGroup = new aws.lb.TargetGroup("targetGroup", {
    port: httpPort,
    protocol: "HTTP",
    vpcId: defaultVpc.id,
});


const httpsListener = new aws.lb.Listener("httpsListener", {
    loadBalancerArn: alb.arn,
    port: httpsPort,
    protocol: "HTTPS",
    defaultActions: [{
        targetGroupArn: testTargetGroup.arn,
        type: "fixed-response",
        fixedResponse: {
            statusCode: "204",
            contentType: "text/plain",
        },
    }],
});


// The test scenario determines which default actions are hooked up to the HTTP listener.
let httpListenerDefaultActions: aws.types.input.elasticloadbalancingv2.ListenerDefaultAction[] = [];

console.log(`Running test scenario #${testScenario}`);
switch (testScenario) {
    case 1:
        // Error: HTTP listener not redirecting to HTTPS.
        httpListenerDefaultActions = [
            {
                type: "redirect",
                redirect: {
                    protocol: "HTTP",
                    statusCode: "HTTP_301",
                },
            },
        ];
        break;
    case 2:
        // OK: Redirects using HTTPS.
        httpListenerDefaultActions = [
            {
                type: "redirect",
                redirect: {
                    protocol: "HTTPS",
                    statusCode: "HTTP_301",
                },
            },
        ];
        break;
    default:
        throw new Error(`Unexpected test scenario ${testScenario}`);
}

export const httpListener = new aws.lb.Listener("httpListener", {
    loadBalancerArn: alb.arn,
    port: httpPort,
    protocol: "HTTP",
    defaultActions: httpListenerDefaultActions,
});
