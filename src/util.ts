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

import { EnforcementLevel } from "@pulumi/policy";

import { isEnforcementLevel } from "./enforcementLevel";
import { PolicyArgs } from "./policyArgs";

/** @internal */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/** @internal */
export function getValueOrDefault<TArgs extends PolicyArgs>(
    args: EnforcementLevel | TArgs | undefined,
    def: RequiredBy<TArgs, keyof PolicyArgs>,
): RequiredBy<TArgs, keyof PolicyArgs> {
    const result = Object.assign({}, def);
    if (!args) {
        return result;
    }
    if (isEnforcementLevel(args)) {
        result.enforcementLevel = args;
        return result;
    }
    if (typeof args === "object") {
        for (const p of Object.keys(args)) {
            const v = (<any>args)[p];
            if (v !== undefined) {
                (<any>result)[p] = v;
            }
        }
    }
    return result;
}
