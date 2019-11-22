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

import { PolicyPack } from "@pulumi/policy";

import * as compute from "./compute";
import * as database from "./database";
import * as elasticsearch from "./elasticsearch";
import * as security from "./security";
import * as storage from "./storage";

import * as path from "path";

function isBeingLoadedDirectly(): boolean {
    if (!module.parent) {
        return false;  // We cannot say for sure.
    }

    // Fully qualified path to the module that loaded this one. The loader for policy packs
    // will be something like ".../node_modules/@pulumi/pulumi/cmd/run-policy-pack/run.js".
    let parentModuleFilepath = module.parent.filename;
    parentModuleFilepath = parentModuleFilepath.replace(path.sep, "/");
    return parentModuleFilepath.indexOf("/@pulumi/pulumi/") !== -1;
}

// Check if the module is being loaded directly, rather than simply being referenced
// as a dependency. When loaded directly, we export a policy pack with the full set
// of AWS Guard rules using their default settings.
//
// In order to customize the policy pack, you will need to create a new node module
// and import @pulumi/pulumi-awsguard as a dependency. And then in its index.{js, ts}
// export a new instance of PolicyPack.
if (isBeingLoadedDirectly()) {
    // NOTE: The integration tests depend on these being mandatory.
    // We might want to have the default be "advisory" for consumers,
    // but have a special build/version specific to our tests.
    const e = "mandatory";

    const policyPack = new PolicyPack("pulumi-awsguard", {
        policies: [
            ...compute.getPolicies(e, {}),
            ...database.getPolicies(e, {}),
            ...elasticsearch.getPolicies(e, {}),
            ...security.getPolicies(e, {}),
            ...storage.getPolicies(e, {}),
        ],
    });
}
