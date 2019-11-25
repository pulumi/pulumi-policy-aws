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

import { AwsGuard, AwsGuardArgs } from "./awsGuard";

// Import each area to add AwsGuardArgs mixins and register policies.
import "./compute";
import "./database";
import "./elasticsearch";
import "./security";
import "./storage";

export { AwsGuard, AwsGuardArgs };

// If we're running our integration tests, create a new instance of AwsGuard.
if (process.env["PULUMI_AWSGUARD_TESTING"] === "true") {
    const awsGuard = new AwsGuard();
}
