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


const config = new pulumi.Config();
const testScenario = config.getNumber("scenario");

let encryptedAtRestParam: aws.types.input.elasticsearch.DomainEncryptAtRest | undefined;
let vpcOptionsParam: aws.types.input.elasticsearch.DomainVpcOptions | undefined;

console.log(`Running test scenario #${testScenario}`);
switch (testScenario) {
    case 1:
        // Leave undefined.
        encryptedAtRestParam = undefined;
        break;
    case 2:
        // Property set, but not enabled.
        encryptedAtRestParam = {
            enabled: false,
        };
        break;
    case 3:
        // Successfully encrypted at rest.
        encryptedAtRestParam = {
            enabled: true,
        };
        // ... but fail because vpcOptionsParam is still undefined.
        break;
    case 4:
        // Use the default VPC for the AWS account
        const defaultVpc = awsx.ec2.Vpc.getDefault();

        console.log("Default VPC", defaultVpc);

        // Should update successful with a valid Elasticsearch domain!
        encryptedAtRestParam = {
            enabled: true,
        };
        vpcOptionsParam = {
            securityGroupIds: [],
            // You cannot set the VPC ID. Instead you must specify exactly one subnet ID.
            subnetIds: [defaultVpc.publicSubnetIds[0]],
        };
        break;
    default:
        throw new Error(`Unexpected test scenario ${testScenario}`);
}

const domainName = `awsguard-${pulumi.getStack()}`;
console.log("Creating domain: ", domainName);

const esDomain = new aws.elasticsearch.Domain("not-encrypted-at-rest", {
    domainName,

    // Configure specific parameters based on test scenario.
    encryptAtRest: encryptedAtRestParam,
    vpcOptions: vpcOptionsParam,

    // Encryption at rest, which we are verifying is enabled, is only offered
    // on certain machine sizes. (Which is why we are using m4.large and not
    // a t2.small.)
    clusterConfig: {
        instanceCount: 1,
        instanceType: "m4.large.elasticsearch",
        dedicatedMasterEnabled: false,
        dedicatedMasterCount: 0,
        dedicatedMasterType: "m4.large.elasticsearch",
    },
    ebsOptions: {
        ebsEnabled: true,
        volumeSize: 35,
        volumeType: "gp2",
    },
    elasticsearchVersion: "7.1",
    tags: {
        "Source": "testing pulumi-awsguard",
    },
});

exports.esDomainName = esDomain.domainName;
