// Copyright 2016-2020, Pulumi Corporation.
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
import { ResourceValidationArgs } from "@pulumi/policy";


import * as compute from "../compute";

import { assertHasResourceViolation, assertNoResourceViolations, createResourceValidationArgs } from "./util";


describe("#ec2BlockDeviceEncryption", () => {
  const policy = compute.encryptedVolumes;

  function getHappyPathArgs(): ResourceValidationArgs {
    return createResourceValidationArgs(aws.ec2.Instance, {
      ami: "ami-12345678",
      instanceType: "t2.micro",
      rootBlockDevice: {
        encrypted: true,
        kmsKeyId: "test-key-id",
      },
      ebsBlockDevices: [{
        deviceName: "/dev/test",
        encrypted: true,
        kmsKeyId: "test-key-id",
      }],
    }, { kmsId: "test-key-id" },
    );
  }

  it("Should pass if the instance is configured properly.", async () => {
    const args = getHappyPathArgs();
    await assertNoResourceViolations(policy, args);
  });

  it("Should fail if root block device is undefined", async () => {
    const args = getHappyPathArgs();
    args.props.rootBlockDevice = undefined;

    const msg = "The EC2 instance root block device must be encrypted.";
    await assertHasResourceViolation(policy, args, { message: msg });

  });

  it("Should fail if root block device is unencrypted", async () => {
    const args = getHappyPathArgs();
    args.props.rootBlockDevice = {
      encrypted: false,
    };

    const msg = "The EC2 instance root block device must be encrypted.";
    await assertHasResourceViolation(policy, args, { message: msg });

  });

  it("Should fail if the root block device is encrypted with an improper key", async () => {
    const args = getHappyPathArgs();
    args.props.rootBlockDevice.kmsKeyId = "incorrect-key";

    const msg = "The EC2 instance root block device must be encrypted with required key: test-key-id.";
    await assertHasResourceViolation(policy, args, { message: msg });

  });

  it("Should fail if any additional ebs block devices are unencrypted", async () => {
    const args = getHappyPathArgs();
    args.props.ebsBlockDevices[0].encrypted = false;

    const msg = "EBS volume (undefined) must be encrypted.";
    await assertHasResourceViolation(policy, args, { message: msg });

  });

  it("Should fail if any additional ebs block devices are encrypted with an improper key", async () => {
    const args = getHappyPathArgs();
    args.props.ebsBlockDevices[0].kmsKeyId = "incorrect-key";

    const msg = "EBS volume (undefined) must be encrypted with required key: test-key-id.";
    await assertHasResourceViolation(policy, args, { message: msg });
  });
});
