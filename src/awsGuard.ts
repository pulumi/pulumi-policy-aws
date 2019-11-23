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
    ResourceValidationPolicy,
    StackValidationPolicy,
} from "@pulumi/policy";

import { defaultEnforcementLevel, isEnforcementLevel } from "./enforcementLevel";

const defaultPolicyPackName = "pulumi-awsguard";

// Internal map that holds all the registered policy factories.
const factoryMap: Record<string, PolicyFactory<any>> = {};

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
 * const awsGuard = new AwsGuard({ all: "mandatory" });
 * ```
 *
 * To make all policies advisory rather than mandatory:
 *
 * ```typescript
 * const awsGuard = new AwsGuard({ all: "advisory" });
 * ```
 *
 * To make all policies advisory, but changing a couple to be mandatory:
 *
 * ```typescript
 * const awsGuard = new AwsGuard({
 *     all: "advisory",
 *     ec2InstanceNoPublicIP: "mandatory",
 *     elbAccessLoggingEnabled: "mandatory",
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
 *     ec2VolumeInUseCheck: { enforcementLevel: "mandatory", checkDeletion: false },
 *     encryptedVolumes: { enforcementLevel: "mandatory", kmsId: "id" },
 * });
 * ```
 */
export class AwsGuard extends PolicyPack {
    constructor(args?: AwsGuardArgs);
    constructor(name: string, args?: AwsGuardArgs);
    constructor(nameOrArgs?: string | AwsGuardArgs, args?: AwsGuardArgs) {
        const [n, a] = getNameAndArgs(nameOrArgs, args);
        super(n, { policies: getPolicies(factoryMap, a) });
    }
}

/**
 * Argument bag for configuring AwsGuard policies.
 */
// Mixins will be applied to this interface in each module that adds a property to
// configure each policy.
export interface AwsGuardArgs {
    all?: EnforcementLevel;
}

/** @internal */
export type PolicyFactory<TArgs> = (args?: TArgs) => ResourceValidationPolicy | StackValidationPolicy;

/** @internal */
export function registerPolicy<K extends keyof AwsGuardArgs>(
    property: Exclude<K, "all">,
    factory: PolicyFactory<AwsGuardArgs[K]>): void {

    if (typeof factory !== "function") {
        throw new Error("'factory' must be a function.");
    }
    if (property === "all") {
        throw new Error("'all' is reserved.");
    }
    if (property in factoryMap) {
        throw new Error(`${property} already exists.`);
    }
    factoryMap[property] = factory;
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
 * Generates the array of policies based on the specified args.
 * @internal
 */
export function getPolicies(factories: Record<string, PolicyFactory<any>>, args?: AwsGuardArgs): Policies {
    // If `args` is falsy or empty, enable all policies with the default enforcement level.
    if (!args || Object.keys(args).length === 0) {
        args = { all: defaultEnforcementLevel };
    }
    // If `all` isn't set explicitly, clone `args` and set it to the default enforcement level.
    if (!args.all) {
        args = Object.assign({}, args);
        args.all = defaultEnforcementLevel;
    }

    const policies: Policies = [];

    const keys = Object.keys(factories).sort();
    for (const key of keys) {
        const factory = factories[key];

        let factoryArgs: any = undefined;
        if (args.hasOwnProperty(key)) {
            factoryArgs = (<Record<string, any>>args)[key];
        }
        if (!factoryArgs) {
            factoryArgs = args.all;
        }

        // If the policy is disabled, skip it.
        if (isEnforcementLevel(factoryArgs) && factoryArgs === "disabled") {
            continue;
        }

        const policy = factory(factoryArgs);
        policies.push(policy);
    }

    // Filter out any disabled policies.
    return policies.filter(p => p.enforcementLevel !== "disabled");
}
