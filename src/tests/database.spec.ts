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

import * as assert from "assert";

import "mocha";

import * as aws from "@pulumi/aws";
import { ResourceValidationArgs } from "@pulumi/policy";

import * as database from "../database";
import { assertHasResourceViolation, assertNoResourceViolations, createResourceValidationArgs } from "./util";

describe("#redshiftClusterConfiguration", () => {
    describe("encryption and logging must be enabled and node types specified", async () => {
        const policy = database.redshiftClusterConfiguration;

        function getHappyPathArgs(): ResourceValidationArgs {
            return createResourceValidationArgs(aws.redshift.Cluster, {
                clusterIdentifier: "test",
                nodeType: "dc1.large",
                logging: {
                    enable: true,
                },
                encrypted: true,
            }, {
                clusterDbEncrypted: true,
                loggingEnabled: true,
                nodeTypes: ["dc1.large", "test"],
            });
        }

        it("Should pass if cluster's configured properly", async () => {
            const args = getHappyPathArgs();
            await assertNoResourceViolations(policy, args);
        });


        it("Should fail if cluster's if encrypted is undefined", async () => {
            const args = getHappyPathArgs();
            args.props.encrypted = undefined;

            const msg = "Redshift cluster must be encrypted.";
            await assertHasResourceViolation(policy, args, { message: msg });
        });

        it("Should fail if cluster's if encrypted is false", async () => {
            const args = getHappyPathArgs();
            args.props.encrypted = false;

            const msg = "Redshift cluster must be encrypted.";
            await assertHasResourceViolation(policy, args, { message: msg });
        });

        it("Should fail if cluster's node type is not allowed", async () => {
            const args = getHappyPathArgs();
            args.props.nodeType = "not-allowed";

            const msg = "Redshift cluster node type must be one of the following: dc1.large,test";
            await assertHasResourceViolation(policy, args, { message: msg });
        });

        it("Should fail if cluster's logging is undefined", async () => {
            const args = getHappyPathArgs();
            args.props.logging = undefined;

            const msg = "Redshift cluster must have logging enabled.";
            await assertHasResourceViolation(policy, args, { message: msg });
        });

        it("Should fail if cluster's logging is not enabled", async () => {
            const args = getHappyPathArgs();
            args.props.logging.enable = false;

            const msg = "Redshift cluster must have logging enabled.";
            await assertHasResourceViolation(policy, args, { message: msg });
        });
    });

    describe("encryption and logging must be disabled and no nodeTypes specified", () => {
        const policy = database.redshiftClusterConfiguration;

        function getHappyPathArgs(): ResourceValidationArgs {
            return createResourceValidationArgs(aws.redshift.Cluster, {
                clusterIdentifier: "test",
                nodeType: "dc1.large",
                logging: {
                    enable: false,
                },
                encrypted: false,
            }, {
                clusterDbEncrypted: false,
                loggingEnabled: false,
                nodeTypes: false,
            });
        }

        it("Should pass if cluster's configured properly", async () => {
            const args = getHappyPathArgs();
            args.props.logging = undefined;
            args.props.encrypted = undefined;

            await assertNoResourceViolations(policy, args);
        });

        it("Should pass if cluster's explicitly configured properly", async () => {
            const args = getHappyPathArgs();
            await assertNoResourceViolations(policy, args);
        });

        it("Should fail if cluster has encryption enabled", async () => {
            const args = getHappyPathArgs();
            args.props.encrypted = true;

            const msg = "Redshift cluster must not be encrypted.";
            await assertHasResourceViolation(policy, args, { message: msg });
        });

        it("Should fail if cluster has logging enabled", async () => {
            const args = getHappyPathArgs();
            args.props.logging.enable = true;

            const msg = "Redshift cluster must not have logging enabled.";
            await assertHasResourceViolation(policy, args, { message: msg });
        });
    });
});

describe("#redshiftClusterMaintenanceSettings", () => {
    describe("allVersionUpgrade required, preferred maintenance window and automate retention of 1", async () => {
        const policy = database.redshiftClusterMaintenanceSettings;
        // enforcementLevel: "mandatory",
        // allowVersionUpgrade: true,
        // preferredMaintenanceWindow: "Mon:09:30-Mon:10:00",
        // automatedSnapshotRetentionPeriod: 1,
        function getHappyPathArgs(): ResourceValidationArgs {
            return createResourceValidationArgs(aws.redshift.Cluster, {
                clusterIdentifier: "test",
                nodeType: "dc1.large",
                allowVersionUpgrade: true,
                preferredMaintenanceWindow: "Mon:09:30-Mon:10:00",
                automatedSnapshotRetentionPeriod: 1,
            });
        }

        it("Should pass if cluster's maintenance configured properly", async () => {
            const args = getHappyPathArgs();
            await assertNoResourceViolations(policy, args);
        });

        it("Should pass if cluster's maintenance configured properly due to defaults", async () => {
            const args = getHappyPathArgs();
            args.props.allowVersionUpgrade = undefined;
            args.props.automatedSnapshotRetentionPeriod = undefined;
            await assertNoResourceViolations(policy, args);
        });

        it("Should fail if cluster's maintenance does not allow version upgrade", async () => {
            const args = getHappyPathArgs();
            args.props.allowVersionUpgrade = false;

            const msg = "Redshift cluster must allow version upgrades.";
            await assertHasResourceViolation(policy, args, { message: msg });
        });

        it("Should fail if cluster's preferred maintenance window is undefined", async () => {
            const args = getHappyPathArgs();
            args.props.preferredMaintenanceWindow = undefined;

            const msg = "Redshift cluster must specify the preferred maintenance window:";
            await assertHasResourceViolation(policy, args, { message: msg });
        });

        it("Should fail if cluster's preferred maintenance window is not the required one", async () => {
            const args = getHappyPathArgs();
            args.props.preferredMaintenanceWindow = "some other time";

            const msg = "Redshift cluster must specify the preferred maintenance window:";
            await assertHasResourceViolation(policy, args, { message: msg });
        });

        it("Should fail if cluster's automated snapshot is not the required one", async () => {
            const args = getHappyPathArgs();
            args.props.automatedSnapshotRetentionPeriod = 10;

            const msg = "Redshift cluster must specify an automated snapshot retention period of ";
            await assertHasResourceViolation(policy, args, { message: msg });
        });
    });

    describe("preferred maintenance window and retention period not specified", async () => {
        const policy = database.redshiftClusterMaintenanceSettings;

        function getHappyPathArgs(): ResourceValidationArgs {
            return createResourceValidationArgs(aws.redshift.Cluster, {
                clusterIdentifier: "test",
                nodeType: "dc1.large",
                allowVersionUpgrade: true,
                preferredMaintenanceWindow: "some random time window",
                automatedSnapshotRetentionPeriod: 1,
            });
        }

        it("Should pass if cluster's maintenance configured properly", async () => {
            const args = getHappyPathArgs();
            await assertNoResourceViolations(policy, args);
        });
    });
});

describe("#redshiftClusterPublicAccess", () => {
    const policy = database.redshiftClusterPublicAccess;

    function getHappyPathArgs(): ResourceValidationArgs {
        return createResourceValidationArgs(aws.redshift.Cluster, {
            clusterIdentifier: "test",
            nodeType: "dc1.large",
            publiclyAccessible: false,
        });
    }

    it("Should pass if cluster is not publicly accessible", async () => {
        const args = getHappyPathArgs();
        await assertNoResourceViolations(policy, args);
    });

    it("Should fail if cluster's publiclyAccessible is set to default", async () => {
        const args = getHappyPathArgs();
        args.props.publiclyAccessible = undefined;
        const msg = "Redshift cluster must not be publicly accessible.";
        await assertHasResourceViolation(policy, args, { message: msg });
    });

    it("Should fail if cluster's publiclyAccessible is set to true", async () => {
        const args = getHappyPathArgs();
        args.props.publiclyAccessible = true;
        const msg = "Redshift cluster must not be publicly accessible.";
        await assertHasResourceViolation(policy, args, { message: msg });
    });
});

describe("#dynamodbTableEncryptionEnabled", () => {
    const policy = database.dynamodbTableEncryptionEnabled;

    function getHappyPathArgs(): ResourceValidationArgs {
        return createResourceValidationArgs(aws.dynamodb.Table, {
            hashKey: "test",
            attributes: [],
            serverSideEncryption: {
                enabled: true,
            },
        });
    }

    it("Should pass if table is encrypted", async () => {
        const args = getHappyPathArgs();
        await assertNoResourceViolations(policy, args);
    });

    it("Should pass if table is encryption is not specified", async () => {
        const args = getHappyPathArgs();
        args.props.serverSideEncryption = undefined;
        await assertNoResourceViolations(policy, args);
    });

    it("Should fail if table's encryption is set to false", async () => {
        const args = getHappyPathArgs();
        args.props.serverSideEncryption.enabled = false;

        const msg = "DynamoDB must have server side encryption enabled.";
        await assertHasResourceViolation(policy, args, { message: msg });
    });
});

describe("#rdsInstanceBackupEnabled", () => {
    describe("retention period and window are specified, check read replicas", () => {
        const policy = database.rdsInstanceBackupEnabled;

        function getHappyPathArgs(): ResourceValidationArgs {
            return createResourceValidationArgs(aws.rds.Instance, {
                instanceClass: "db.m5.large",
                backupRetentionPeriod: 7,
                backupWindow: "window",
                replicateSourceDb: "some-there-db",
            });
        }

        it("Should pass if backup retention explicity matches", async () => {
            const args = getHappyPathArgs();
            await assertNoResourceViolations(policy, args);
        });

        it("Should pass if backup retention implicitly matches", async () => {
            const args = getHappyPathArgs();
            args.props.backupRetentionPeriod = undefined;
            await assertNoResourceViolations(policy, args);
        });

        it("Should fail if theres a backup retention period mismatch", async () => {
            const args = getHappyPathArgs();
            args.props.backupRetentionPeriod = 10;

            const msg = "RDS Instances must have a backup retention period of: 7.";
            await assertHasResourceViolation(policy, args, { message: msg });
        });

        it("Should fail if theres a backup window mismatch", async () => {
            const args = getHappyPathArgs();
            args.props.backupWindow = "another-window";

            const msg = "RDS Instances must have a backup preferred back up window of: window.";
            await assertHasResourceViolation(policy, args, { message: msg });
        });

        it("Should fail if the backup window is not specified", async () => {
            const args = getHappyPathArgs();
            args.props.backupWindow = undefined;

            const msg = "RDS Instances must have a backup preferred back up window of: window.";
            await assertHasResourceViolation(policy, args, { message: msg });
        });
    });

    describe("do not check read replicas", () => {
        const policy = database.rdsInstanceBackupEnabled;

        function getHappyPathArgs(): ResourceValidationArgs {
            return createResourceValidationArgs(aws.rds.Instance, {
                instanceClass: "db.m5.large",
                backupRetentionPeriod: 0,
                backupWindow: "another-window",
                replicateSourceDb: "some-there-db",
            });
        }

        it("Should pass if read replica is not backed up", async () => {
            const args = getHappyPathArgs();
            await assertNoResourceViolations(policy, args);
        });
    });

    describe("do not specify a required backup period or window", () => {
        const policy = database.rdsInstanceBackupEnabled;

        function getHappyPathArgs(): ResourceValidationArgs {
            return createResourceValidationArgs(aws.rds.Instance, {
                instanceClass: "db.m5.large",
                backupRetentionPeriod: 10,
                backupWindow: "random-window",
            });
        }

        it("Should pass is backup retention period is explicitly set", async () => {
            const args = getHappyPathArgs();
            await assertNoResourceViolations(policy, args);
        });

        it("Should pass is backup retention period is implicitly set", async () => {
            const args = getHappyPathArgs();
            args.props.backupRetentionPeriod = undefined;
            await assertNoResourceViolations(policy, args);
        });

        it("Should fail is backup retention period is set to 0", async () => {
            const args = getHappyPathArgs();
            args.props.backupRetentionPeriod = 0;

            const msg = "RDS Instances must have backups enabled.";
            await assertHasResourceViolation(policy, args, { message: msg });
        });
    });

    // describe("a poorly configure policy", () => {
    //     it("Should throw an error", () => {
    //         assert.throws(
    //             () => { database.rdsInstanceBackupEnabled({ backupRetentionPeriod: 0 }); },
    //             "Specified retention period must be greater than 0");
    //     });
    // });
});

describe("#rdsInstanceMultiAZEnabled", () => {
    const policy = database.rdsInstanceMultiAZEnabled;
    function getHappyPathArgs(): ResourceValidationArgs {
        return createResourceValidationArgs(aws.rds.Instance, {
            instanceClass: "db.m5.large",
            multiAz: true,
        });
    }

    it("Should pass if instance is not publicly accessible", async () => {
        const args = getHappyPathArgs();
        await assertNoResourceViolations(policy, args);
    });

    it("Should fail if multiAz is not specified", async () => {
        const args = getHappyPathArgs();
        args.props.multiAz = undefined;

        const msg = "RDS Instances must be configured with multiple AZs for highly available.";
        await assertHasResourceViolation(policy, args, { message: msg });
    });

    it("Should fail if instance's multiAz is set to false", async () => {
        const args = getHappyPathArgs();
        args.props.multiAz = false;
        const msg = "RDS Instances must be configured with multiple AZs for highly available.";
        await assertHasResourceViolation(policy, args, { message: msg });
    });
});

describe("#rdsInstancePublicAccess", () => {
    const policy = database.rdsInstancePublicAccess;
    function getHappyPathArgs(): ResourceValidationArgs {
        return createResourceValidationArgs(aws.rds.Instance, {
            instanceClass: "db.m5.large",
            backupRetentionPeriod: 10,
            backupWindow: "random-window",
            publiclyAccessible: false,
        });
    }

    it("Should pass if instance is not publicly accessible", async () => {
        const args = getHappyPathArgs();
        await assertNoResourceViolations(policy, args);
    });

    it("Should pass if publicly accessible is not specified", async () => {
        const args = getHappyPathArgs();
        args.props.publiclyAccessible = undefined;
        await assertNoResourceViolations(policy, args);
    });

    it("Should fail if instance is publicly accessible", async () => {
        const args = getHappyPathArgs();
        args.props.publiclyAccessible = true;
        const msg = "RDS Instance must not be publicly accessible.";
        await assertHasResourceViolation(policy, args, { message: msg });
    });
});

describe("#rdsStorageEncrypted", () => {
    describe("kms key is specified", () => {
        const policy = database.rdsStorageEncrypted;

        function getHappyPathArgs(): ResourceValidationArgs {
            return createResourceValidationArgs(aws.rds.Instance, {
                instanceClass: "db.m5.large",
                backupRetentionPeriod: 10,
                backupWindow: "random-window",
                storageEncrypted: true,
                kmsKeyId: "a-kms-key",
            });
        }

        it("Should pass if instance is encrypted and key is specified", async () => {
            const args = getHappyPathArgs();
            await assertNoResourceViolations(policy, args);
        });

        it("Should fail if storage encryption is not specified", async () => {
            const args = getHappyPathArgs();
            args.props.storageEncrypted = undefined;

            const msg = "RDS Instance must have storage encryption enabled.";
            await assertHasResourceViolation(policy, args, { message: msg });
        });


        it("Should fail if kms key is not specified", async () => {
            const args = getHappyPathArgs();
            args.props.kmsKeyId = undefined;

            const msg = "RDS Instance must be encrypted with kms key id: a-kms-key.";
            await assertHasResourceViolation(policy, args, { message: msg });
        });

        it("Should fail if storage encryption is false", async () => {
            const args = getHappyPathArgs();
            args.props.storageEncrypted = false;

            const msg = "RDS Instance must have storage encryption enabled.";
            await assertHasResourceViolation(policy, args, { message: msg });
        });

        it("Should pass if storage encryption if read replica has kms key", async () => {
            const args = getHappyPathArgs();
            args.props.storageEncrypted = undefined;
            args.props.replicateSourceDb = "some-other-db";

            await assertNoResourceViolations(policy, args);
        });
    });

    describe("kms key is not specified", () => {
        const policy = database.rdsStorageEncrypted;
        function getHappyPathArgs(): ResourceValidationArgs {
            return createResourceValidationArgs(aws.rds.Instance, {
                instanceClass: "db.m5.large",
                backupRetentionPeriod: 10,
                backupWindow: "random-window",
                storageEncrypted: true,
            });
        }

        it("Should pass if instance is encrypted", async () => {
            const args = getHappyPathArgs();
            await assertNoResourceViolations(policy, args);
        });

        it("Should fail if storage encryption is not specified", async () => {
            const args = getHappyPathArgs();
            args.props.storageEncrypted = undefined;

            const msg = "RDS Instance must have storage encryption enabled.";
            await assertHasResourceViolation(policy, args, { message: msg });
        });

        it("Should fail if storage encryption is false", async () => {
            const args = getHappyPathArgs();
            args.props.storageEncrypted = false;

            const msg = "RDS Instance must have storage encryption enabled.";
            await assertHasResourceViolation(policy, args, { message: msg });
        });

        it("Should pass if storage encryption is false AND its a read replica", async () => {
            const args = getHappyPathArgs();
            args.props.storageEncrypted = false;
            args.props.replicateSourceDb = "some-other-db";

            await assertNoResourceViolations(policy, args);
        });
    });
});
