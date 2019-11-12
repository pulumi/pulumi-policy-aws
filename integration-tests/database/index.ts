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

const config = new pulumi.Config();
const testScenario = config.getNumber("scenario");

let redshiftClusterArgs: aws.redshift.ClusterArgs | undefined;

console.log(`Running test scenario #${testScenario}`);
switch (testScenario) {
    case 1:
        // Happy Path.
        redshiftClusterArgs = {
            clusterIdentifier: "test",
            nodeType: "dc1.large",
            allowVersionUpgrade: true,
            logging: {
                enable: true,
                bucketName: "random bucket",
            },
            encrypted: true,
            publiclyAccessible: false,
        };
        break;
    case 2:
        // Logging undefined, not encrypted, does not allow version upgrade
        // and is publicly accessible.
        redshiftClusterArgs = {
            clusterIdentifier: "test",
            nodeType: "dc1.large",
            allowVersionUpgrade: false,
        };
        break;
    default:
        throw new Error(`Unexpected test scenario ${testScenario}`);
}

const redshiftCluster = `awsguard-${pulumi.getStack()}`;
console.log("Creating redshift cluster: ", redshiftCluster);
new aws.redshift.Cluster("test-cluster", redshiftClusterArgs)


