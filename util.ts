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

// getValueOrDefault will return x IFF it is defined, otherwise the provided default.
// (Since shenanigans like `x || true` break down when x has a falsy value.)
export function getValueOrDefault<T>(x: T | undefined, def: T): T {
    if (x !== undefined) {
        return x;
    }
    return def;
}
