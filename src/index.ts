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
import "./apiGateway";
import "./compute";
import "./database";
import "./elasticsearch";
import "./network";
import "./security";
import "./storage";

export { AwsGuard, AwsGuardArgs };

// To create a policy pack using all of the AWS Guard rules,  create
// a new NPM module and add the following code:
//
// Using JavaScript
//      const awsguard = require("@pulumi/awsguard");
//      new awsguard.AwsGuard({ all: "mandatory" });
//
// Using TypeScript
//      import { AwsGuard, AwsGuardArgs } from "@pulumi/awsguard";
//      new AwsGuard({ all: "mandatory" });
//
// Though you may want to configure any individual rules or their
// settings by writing more code.
//
// Fore more information on enabling and configuring AWS Guard, see:
// https://www.pulumi.com/docs/guides/crossguard
