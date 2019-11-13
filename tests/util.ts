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

import * as policy from "@pulumi/policy";

import { Resource, Unwrap } from "@pulumi/pulumi";

import * as assert from "assert";

// createResourceValidationArgs will create a ResourceValidationArgs using the `type` from
// the specified `resourceClass` and `props` returned from the specified `argsFactory`.
// The return type of the `argsFactory` is the unwrapped args bag for the resource, inferred
// from the resource's constructor parameters.
export function createResourceValidationArgs<TResource extends Resource, TArgs>(
    resourceClass: { new(name: string, args: TArgs, ...rest: any[]): TResource },
    args: NonNullable<Unwrap<TArgs>>,
): policy.ResourceValidationArgs {
    const type = (<any>resourceClass).__pulumiType;
    if (typeof type !== "string") {
        assert.fail("Could not determine Pulumi type from resourceClass.");
    }

    return {
        type: type as string,
        props: args,
    };
}

export interface PolicyViolation {
    message: string;
    urn?: string;
}

// testPolicy will run some basic checks for a policy's metadata, and then
// execute its rules with the provided type and properties.
async function runPolicy(resPolicy: policy.ResourceValidationPolicy, args: policy.ResourceValidationArgs): Promise<PolicyViolation[]> {
    const violations: PolicyViolation[] = [];
    const report = (message: string, urn?: string) => {
        violations.push({ message: message, urn: urn });
    };
    const validations = Array.isArray(resPolicy.validateResource)
        ? resPolicy.validateResource
        : [resPolicy.validateResource];
    for (const validation of validations) {
        await Promise.resolve(validation(args, report));
    }
    return violations;
}

// assertNoViolations runs the policy and confirms no violations were found.
export async function assertNoViolations(resPolicy: policy.ResourceValidationPolicy, args: policy.ResourceValidationArgs) {
    const allViolations = await runPolicy(resPolicy, args);
    if (allViolations && allViolations.length > 0) {
        for (const violation of allViolations) {
            const urnSuffix = violation.urn ? `(URN=${violation.urn})` : "";
            console.log(`VIOLATION: ${violation.message} ${urnSuffix}`);
        }
        assert.fail("got violations but wasn't expecting any.");
    }
}


// assertHasViolation runs the policy and confirms the expected violation is reported.
export async function assertHasViolation(
    resPolicy: policy.ResourceValidationPolicy, args: policy.ResourceValidationArgs, wantViolation: PolicyViolation) {
    const allViolations = await runPolicy(resPolicy, args);
    if (!allViolations || allViolations.length === 0) {
        assert.fail("no violations reported");
    } else {
        for (const reportedViolation of allViolations) {
            // If we expect a specific URN, require that in the reported violation.
            // The converse is not true, we allow test authors to omit the URN
            // even if it is included in the matched violation.
            if (wantViolation.urn && !reportedViolation.urn) {
                continue;
            }

            const messageMatches = reportedViolation.message.indexOf(wantViolation.message) !== -1;
            let urnMatches = true;
            if (reportedViolation.urn && wantViolation.urn) {
                urnMatches = reportedViolation.urn.indexOf(wantViolation.urn) !== -1;
            }

            if (messageMatches && urnMatches) {
                // Success! We found the violation we were looking for.
                return;
            }
        }

        // Print all reported violations for easier debugging of failing tests.
        console.log("Reported Violations:");
        for (const reported of allViolations) {
            console.log(`urn: ${reported.urn} - message: ${reported.message}`);
        }
        assert.fail(`violation with substrings message:'${wantViolation.message}' urn:'${wantViolation.urn}' not found.'`);
    }
}
