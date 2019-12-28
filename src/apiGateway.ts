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

import { EnforcementLevel, ResourceValidationPolicy, validateTypedResource } from "@pulumi/policy";

import { registerPolicy } from "./awsGuard";
import { defaultEnforcementLevel } from "./enforcementLevel";
import { PolicyArgs } from "./policyArgs";
import { getValueOrDefault } from "./util";

// Mixin additional properties onto AwsGuardArgs.
declare module "./awsGuard" {
    interface AwsGuardArgs {
        apiGatewayStageCached?: EnforcementLevel;
        apiGatewayMethodCachedAndEncrypted?: EnforcementLevel;
        apiGatewayEndpointTypeCheck?: EnforcementLevel | ApiGatewayEndpointTypeCheckArgs;
    }
}

// Register policy factories.
registerPolicy("apiGatewayStageCached", apiGatewayStageCached);
registerPolicy("apiGatewayMethodCachedAndEncrypted", apiGatewayMethodCachedAndEncrypted);
registerPolicy("apiGatewayEndpointTypeCheck", apiGatewayEndpointTypeCheck);

/** @internal */
export function apiGatewayStageCached(enforcementLevel?: EnforcementLevel): ResourceValidationPolicy {
    return {
        name: "apigateway-stage-cached",
        description: "Checks that API Gateway Stages have a cache cluster enabled.",
        enforcementLevel: enforcementLevel || defaultEnforcementLevel,
        validateResource: validateTypedResource(aws.apigateway.Stage, (stage, _, reportViolation) => {
            if (!stage.cacheClusterEnabled) {
                reportViolation(`API Gateway Stage '${stage.stageName}' does not have a cache cluster enabled.`);
            }
        }),
    };
}

/** @internal */
export function apiGatewayMethodCachedAndEncrypted(enforcementLevel?: EnforcementLevel): ResourceValidationPolicy {
    return {
        name: "apigateway-method-cached-and-encrypted",
        description: "Checks API Gateway Methods that responses are configured to be cached and that those cached responses are encrypted.",
        enforcementLevel: enforcementLevel || defaultEnforcementLevel,
        validateResource: validateTypedResource(aws.apigateway.MethodSettings, (methodSettings, _, reportViolation) => {
            if (!methodSettings.settings.cachingEnabled) {
                reportViolation(`API Gateway Method '${methodSettings.methodPath}' does not have caching enabled.`);
            }
            if (!methodSettings.settings.cacheDataEncrypted) {
                reportViolation(`API Gateway Method '${methodSettings.methodPath}' not configured to encrypt cached responses.`);
            }
        }),
    };
}

export interface ApiGatewayEndpointTypeCheckArgs extends PolicyArgs {
    /** Whether or not API Endpoint type EDGE is allowed. */
    allowEdge?: boolean;
    /** Whether or not API Endpoint type REGIONAL is allowed. */
    allowRegional?: boolean;
    /** Whether or not API Endpoint type PRIVATE is allowed. */
    allowPrivate?: boolean;
}

/** @internal */
export function apiGatewayEndpointTypeCheck(
    args?: EnforcementLevel | ApiGatewayEndpointTypeCheckArgs): ResourceValidationPolicy {

    const { enforcementLevel, allowEdge, allowRegional, allowPrivate } = getValueOrDefault(args, {
        enforcementLevel: defaultEnforcementLevel,
        allowEdge: true,
        allowRegional: false,
        allowPrivate: false,
    });

    return {
        name: "apigateway-endpoint-type-check",
        description: "Checks API Gateway endpoint configuration is one of the allowed types.",
        enforcementLevel: enforcementLevel || defaultEnforcementLevel,
        validateResource: validateTypedResource(aws.apigateway.RestApi, (restApi, _, reportViolation) => {
            let endpointType = "(endpointConfiguration.types unspecified)";
            if (restApi.endpointConfiguration) {
                endpointType = restApi.endpointConfiguration.types;
            }

            const wrappedReportViolation = () => {
                reportViolation(`API Gateway '${restApi.name}' has an unsupported endpoint type '${endpointType}'.`);
            };

            switch (endpointType) {
                case "EDGE":
                    if (!allowEdge) {
                        wrappedReportViolation();
                    }
                    break;
                case "REGIONAL":
                    if (!allowRegional) {
                        wrappedReportViolation();
                    }
                    break;
                case "PRIVATE":
                    if (!allowPrivate) {
                        wrappedReportViolation();
                    }
                    break;

                default:
                    // The API Gateway endpoint type is some other, unknown endpoint type.
                    // Default to it causing a validation error.
                    wrappedReportViolation();
                    break;
            }
        }),
    };
}
