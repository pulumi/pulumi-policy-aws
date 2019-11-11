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

import { Resource } from "@pulumi/pulumi";
import { ResolvedResource } from "@pulumi/pulumi/queryable";

import * as assert from "assert";

// fakeResource will stub out a Pulumi resource's properties, so it can
// be used for testing a policy.
export function fakeResource<T extends Resource>(properties: any): ResolvedResource<T> {
    const r: ResolvedResource<T> = {} as any;
    return Object.assign(r, properties);
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
        assert.fail("got violations but wasn't expecting any.");
        for (const violation of allViolations) {
            const urnSuffix = violation.urn ? `(URN=${violation.urn})` : "";
            console.log(`VIOLATION: ${violation.message} ${urnSuffix}`);
        }
    }
}


// assertHasViolation runs the policy and confirms the expected violation is reported.
export async function assertHasViolation(
    resPolicy: policy.ResourceValidationPolicy, args: policy.ResourceValidationArgs, wantViolation: PolicyViolation) {
    const allViolations = await runPolicy(resPolicy, args);
    if (!allViolations || allViolations.length === 0) {
        assert.fail("no violations reported, but expected one");
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

        console.log("The expected violation was not found. Got the following instead:");
        for (const reportedViolation of allViolations) {
            console.log(`- ${reportedViolation.message} (urn="${reportedViolation.urn})`);
        }
        assert.fail(`violation with substrings message:'${wantViolation.message}' urn:'${wantViolation.urn}' not found.`);
    }
}

// Returns "now", d days in the future or past.
export function daysFromNow(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
}
