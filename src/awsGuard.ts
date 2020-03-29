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

import {
    EnforcementLevel,
    Policies,
    PolicyPack,
    PolicyPackConfig,
    ResourceValidationPolicy,
    StackValidationPolicy,
} from "@pulumi/policy";

import { defaultEnforcementLevel } from "./enforcementLevel";

const defaultPolicyPackName = "pulumi-awsguard";

// Internap map of registered policies;
const registeredPolicies: Record<string, ResourceValidationPolicy | StackValidationPolicy> = {};

/**
 * A policy pack of rules to enforce AWS best practices for security, reliability, cost, and more!
 *
 * Create an instance of AwsGuard without any arguments to enable all policies with their default configuration:
 *
 * ```typescript
 * const awsGuard = new AwsGuard();
 * ```
 *
 * The above is equivalent to:
 *
 * ```typescript
 * const awsGuard = new AwsGuard({ all: "advisory" });
 * ```
 *
 * To make all policies mandatory rather than advisory:
 *
 * ```typescript
 * const awsGuard = new AwsGuard({ all: "mandatory" });
 * ```
 *
 * To make all policies mandatory, but change a couple to be advisory:
 *
 * ```typescript
 * const awsGuard = new AwsGuard({
 *     all: "mandatory",
 *     ec2InstanceNoPublicIP: "advisory",
 *     elbAccessLoggingEnabled: "advisory",
 * });
 * ```
 *
 * To disable a particular policy:
 *
 * ```typescript
 * const awsGuard = new AwsGuard({
 *     ec2InstanceNoPublicIP: "disabled",
 * });
 * ```
 *
 * To disable all policies except ones explicitly enabled:
 *
 * ```typescript
 * const awsGuard = new AwsGuard({
 *     all: "disabled",
 *     ec2InstanceNoPublicIP: "mandatory",
 *     elbAccessLoggingEnabled: "mandatory",
 * });
 * ```
 *
 * To specify configuration for policies that have it:
 *
 * ```typescript
 * const awsGuard = new AwsGuard({
 *     ec2VolumeInUse: { checkDeletion: false },
 *     encryptedVolumes: { enforcementLevel: "mandatory", kmsId: "id" },
 *     redshiftClusterMaintenanceSettings: { preferredMaintenanceWindow: "Mon:09:30-Mon:10:00" },
 *     acmCertificateExpiration: { maxDaysUntilExpiration: 10 },
 * });
 * ```
 */
export class AwsGuard extends PolicyPack {
    constructor(args?: AwsGuardArgs);
    constructor(name: string, args?: AwsGuardArgs);
    constructor(nameOrArgs?: string | AwsGuardArgs, args?: AwsGuardArgs) {
        const [n, a] = getNameAndArgs(nameOrArgs, args);

        const policies: Policies = [];
        for (const key of Object.keys(registeredPolicies)) {
            policies.push(registeredPolicies[key]);
        }

        const initialConfig = getInitialConfig(registeredPolicies, a);

        super(n, { policies, enforcementLevel: defaultEnforcementLevel }, initialConfig);
    }
}

/**
 * Argument bag for configuring AwsGuard policies.
 */
export interface AwsGuardArgs {
    all?: EnforcementLevel;
    // Note: Properties to configure each policy are added to this interface (mixins) by each module.
}

/** @internal */
export function registerPolicy<K extends keyof AwsGuardArgs>(
    property: Exclude<K, "all">,
    policy: ResourceValidationPolicy | StackValidationPolicy): void {

    if (property === "all") {
        throw new Error("'all' is reserved.");
    }
    if (property in registeredPolicies) {
        throw new Error(`${property} already exists.`);
    }
    if (!policy) {
        throw new Error(`policy is falsy.`);
    }
    registeredPolicies[property] = policy;
}

/** @internal */
export function registerPolicyOld<K extends keyof AwsGuardArgs>(
    property: Exclude<K, "all">,
    factory: (args?: AwsGuardArgs[K]) => ResourceValidationPolicy | StackValidationPolicy) {
    // TODO: Delete this function.
}

/**
 * Testable helper to get the name and args from the parameters,
 * for use in the policy pack's constructor.
 * @internal
 */
export function getNameAndArgs(
    nameOrArgs?: string | AwsGuardArgs,
    args?: AwsGuardArgs): [string, AwsGuardArgs | undefined] {

    let name = defaultPolicyPackName;
    if (typeof nameOrArgs === "string") {
        name = nameOrArgs;
    } else if (typeof nameOrArgs === "object") {
        args = nameOrArgs;
    }
    return [name, args];
}

/**
 * Converts args with camelCase properties, to a new object that uses the
 * policy name as the property names rather than the camelCase names.
 * @internal
 */
export function getInitialConfig(
    policyMap: Record<string, ResourceValidationPolicy | StackValidationPolicy>,
    args?: AwsGuardArgs,
): PolicyPackConfig | undefined {
    if (!args) {
        return undefined;
    }

    const result: PolicyPackConfig = {};
    for (const key of Object.keys(args) as Array<keyof AwsGuardArgs>) {
        const val = args[key];
        if (!val) {
            continue;
        }

        // If "all", just add it to the resulting object.
        if (key === "all") {
            result["all"] = val;
            continue;
        }

        // Otherwise, lookup the actual policy name, and use that as the key in
        // the resulting object.
        const policy = policyMap[key];
        if (policy) {
            result[policy.name] = val;
        }
    }
    return result;
}
