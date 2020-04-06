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

import { getNameAndArgs } from "../awsGuard";

// Make mixins available.
import "../index";

describe("#AwsGuard", () => {
    describe("getNameAndArgs", () => {
        it("returns the expected values for the inputs", () => {
            const defaultName = "pulumi-awsguard";
            assert.deepStrictEqual(getNameAndArgs(), [defaultName, undefined]);
            assert.deepStrictEqual(getNameAndArgs("hi"), ["hi", undefined]);
            assert.deepStrictEqual(getNameAndArgs({}), [defaultName, {}]);
            assert.deepStrictEqual(getNameAndArgs({ all: "advisory" }), [defaultName, { all: "advisory" }]);
            assert.deepStrictEqual(
                getNameAndArgs({ ec2VolumeInUse: "advisory" }),
                [defaultName, { ec2VolumeInUse: "advisory" }]);
            assert.deepStrictEqual(
                getNameAndArgs({ ec2VolumeInUse: { checkDeletion: true } }),
                [defaultName, { ec2VolumeInUse: { checkDeletion: true } }]);
            assert.deepStrictEqual(getNameAndArgs("hi", {}), ["hi", {}]);
            assert.deepStrictEqual(getNameAndArgs("hi", { all: "advisory" }), ["hi", { all: "advisory" }]);
            assert.deepStrictEqual(
                getNameAndArgs(undefined, { all: "mandatory" }),
                [defaultName, { all: "mandatory" }]);
            assert.deepStrictEqual(getNameAndArgs({}, { all: "disabled" }), [defaultName, {}]);
        });
    });
});
