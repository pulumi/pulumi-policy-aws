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

import * as aws from "@pulumi/aws";

import { EnforcementLevel, ResourceValidationPolicy, validateResourceOfType } from "@pulumi/policy";

import { registerPolicy } from "./awsGuard";
import { defaultEnforcementLevel } from "./enforcementLevel";

// Mixin additional properties onto AwsGuardArgs.
declare module "./awsGuard" {
    interface AwsGuardArgs {
        albHttpToHttpsRedirection?: EnforcementLevel;
    }
}

// Register policy factories.


/** @internal */
export const albHttpToHttpsRedirection: ResourceValidationPolicy = {
        name: "alb-http-to-https-redirection",
        description: "Checks that the default action for all HTTP listeners is to redirect to HTTPS.",
        validateResource: validateResourceOfType(aws.elasticloadbalancingv2.Listener, (listener, _, reportViolation) => {
            if (listener.protocol !== "HTTP") {
                return;
            }
            // Not a compliance problem per-say, but certainly odd enough to report.
            if (!listener.defaultActions || listener.defaultActions.length === 0) {
                reportViolation(`HTTP listener has no default actions configured.`);
                return;
            }
            if (listener.defaultActions.length > 1) {
                reportViolation(`HTTP listener has more than one default action.`);
                return;
            }
            const defaultAction = listener.defaultActions[0];
            const compliant = true
                && defaultAction.type === "redirect"
                && defaultAction.redirect
                && defaultAction.redirect.protocol === "HTTPS";

            if (!compliant) {
                const msg = `Default action for HTTP listener must be a redirect using HTTPS.`;
                reportViolation(msg);
                return;
            }
        }),
    };
registerPolicy("albHttpToHttpsRedirection", albHttpToHttpsRedirection);
