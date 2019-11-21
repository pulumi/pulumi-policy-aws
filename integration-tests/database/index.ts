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
let dynamodbArgs: aws.dynamodb.TableArgs | undefined;
let rdsInstanceArgs: aws.rds.InstanceArgs | undefined;

console.log(`Running test scenario #${testScenario}`);
switch (testScenario) {
    case 1:
        // Happy Path for redshift cluster.
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
        // and is publicly accessible for redshift cluster.
        redshiftClusterArgs = {
            clusterIdentifier: "test",
            nodeType: "dc1.large",
            allowVersionUpgrade: false,
        };
        break;
    case 3:
        // Happy Path for dynamodb.
        dynamodbArgs = {
            hashKey: "test",
            attributes: [],
            serverSideEncryption: {
                enabled: true,
            },
        };
        break;
    case 4:
        // Dynamodb server side encryption disabled.
        dynamodbArgs = {
            hashKey: "test",
            attributes: [],
            serverSideEncryption: {
                enabled: false,
            },
        };
        break;
    case 5:
        // RDS Instance happy path.
        rdsInstanceArgs = {
            instanceClass: "db.m5.large",
            storageEncrypted: true,
        };
        break;
    case 6:
        // RDS Instance - no backup.
        rdsInstanceArgs = {
            instanceClass: "db.m5.large",
            backupRetentionPeriod: 0,
            publiclyAccessible: true,
        };
        break;
    default:
        throw new Error(`Unexpected test scenario ${testScenario}`);
}

const name = `awsguard-${pulumi.getStack()}`
if (redshiftClusterArgs) {
    console.log("Creating redshift cluster: ", name);
    new aws.redshift.Cluster("test-cluster", redshiftClusterArgs);
}

if (dynamodbArgs) {
    console.log("Creating dynamodb table: ", name);
    new aws.dynamodb.Table("test-table", dynamodbArgs);
}

if (rdsInstanceArgs) {
    console.log("Creating rds instance: ", name);
    new aws.rds.Instance("test-rds-instance", rdsInstanceArgs);
}
