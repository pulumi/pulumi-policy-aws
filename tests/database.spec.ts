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

import "mocha";

import * as aws from "@pulumi/aws";
import * as policy from "@pulumi/policy";

import * as database from "../database";
import { assertHasResourceViolation, assertNoResourceViolations, createResourceValidationArgs } from "./util";

describe("#redshiftClusterConfigurationCheck", () => {
    describe("encryption and logging must be enabled and node types specified", async () => {
        const policy = database.redshiftClusterConfigurationCheck("mandatory", true, true, ["dc1.large", "test"]);
        function getHappyPathArgs(): policy.ResourceValidationArgs {
            return createResourceValidationArgs(aws.redshift.Cluster, {
                clusterIdentifier: "test",
                nodeType: "dc1.large",
                logging: {
                    enable: true,
                },
                encrypted: true,
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

    })

    describe("encryption and logging must be disabled and no nodeTypes specified", () => {
        const policy = database.redshiftClusterConfigurationCheck("mandatory", false, false);

        function getHappyPathArgs(): policy.ResourceValidationArgs {
            return createResourceValidationArgs(aws.redshift.Cluster, {
                clusterIdentifier: "test",
                nodeType: "dc1.large",
                logging: {
                    enable: false,
                },
                encrypted: false,
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
    })
});

describe("#redshiftClusterMaintenanceSettingsCheck", () => {
    describe("allVersionUpgrade required, preferred maintenance window and automate retention of 1", async () => {
        const policy = database.redshiftClusterMaintenanceSettingsCheck("mandatory", true, "Mon:09:30-Mon:10:00", 1);
        function getHappyPathArgs(): policy.ResourceValidationArgs {
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
    })

    describe("preferred maintenance window and retention period not specified", async () => {
        const policy = database.redshiftClusterMaintenanceSettingsCheck("mandatory", true);
        function getHappyPathArgs(): policy.ResourceValidationArgs {
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
    })
});

describe("#redshiftClusterPublicAccessCheck", () => {
    const policy = database.redshiftClusterPublicAccessCheck("mandatory");
    function getHappyPathArgs(): policy.ResourceValidationArgs {
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
