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
            subnetIds: [ defaultVpc.publicSubnetIds[0] ],
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
