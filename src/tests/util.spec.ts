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

import { EnforcementLevel } from "@pulumi/policy";

import { PolicyArgs } from "../policyArgs";
import { getValueOrDefault, RequiredBy } from "../util";

interface FooArgs extends PolicyArgs {
    foo?: string;
}

describe("#getValueOrDefault", () => {
    const def: RequiredBy<FooArgs, keyof PolicyArgs> = {
        enforcementLevel: "mandatory",
        foo: undefined,
    };

    it("returns defaults for undefined or null", () => {
        assert.deepStrictEqual(getValueOrDefault(undefined, def), def);
        assert.deepStrictEqual(getValueOrDefault(<FooArgs><unknown>null, def), def);
    });

    it("returns defaults for invalid enforcement level", () => {
        assert.deepStrictEqual(getValueOrDefault(<EnforcementLevel>"invalidEnforcementLevel", def), def);
    });

    it("returns defaults with modified enforcement level as specified", () => {
        const levels: EnforcementLevel[] = ["mandatory", "advisory", "disabled"];
        for (const el of levels) {
            assert.deepStrictEqual(getValueOrDefault(el, def), {
                enforcementLevel: el,
                foo: undefined,
            });
        }
    });

    it("returns defaults with modified foo as specified", () => {
        assert.deepStrictEqual(getValueOrDefault({ foo: "bar" }, def), {
            enforcementLevel: "mandatory",
            foo: "bar",
        });
    });

    it("returns enforcement level and foo as specified", () => {
        assert.deepStrictEqual(getValueOrDefault({
            enforcementLevel: "advisory",
            foo: "bar",
        }, def), {
            enforcementLevel: "advisory",
            foo: "bar",
        });
    });

    it("returns defaults along with any extra props", () => {
        assert.deepStrictEqual(getValueOrDefault(<FooArgs><unknown>{ bar: "blah" }, def), {
            enforcementLevel: "mandatory",
            foo: undefined,
            bar: "blah",
        });
    });

    it("returns enforcement level and foo as specified along with any extra props", () => {
        assert.deepStrictEqual(getValueOrDefault(<FooArgs><unknown>{
            enforcementLevel: "advisory",
            foo: "bar",
            bar: "blah",
        }, def), {
            enforcementLevel: "advisory",
            foo: "bar",
            bar: "blah",
        });
    });
});
