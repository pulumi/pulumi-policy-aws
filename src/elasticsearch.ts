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
        elasticsearchEncryptedAtRest?: EnforcementLevel;
        elasticsearchInVpcOnly?: EnforcementLevel;
    }
}

// Register policy factories.
registerPolicy("elasticsearchEncryptedAtRest", elasticsearchEncryptedAtRest);
registerPolicy("elasticsearchInVpcOnly", elasticsearchInVpcOnly);

/** @internal */
export function elasticsearchEncryptedAtRest(enforcementLevel?: EnforcementLevel): ResourceValidationPolicy {
    return {
        name: "elasticsearch-encrypted-at-rest",
        description: "Checks if the Elasticsearch Service domains have encryption at rest enabled.",
        enforcementLevel: enforcementLevel || defaultEnforcementLevel,
        validateResource: validateResourceOfType(aws.elasticsearch.Domain, (domain, _, reportViolation) => {
            if (domain.encryptAtRest === undefined || domain.encryptAtRest.enabled === false) {
                reportViolation(`Elasticsearch domain ${domain.domainName} must be encrypted at rest.`);
            }
        }),
    };
}

/** @internal */
export function elasticsearchInVpcOnly(enforcementLevel?: EnforcementLevel): ResourceValidationPolicy {
    return {
        name: "elasticsearch-in-vpc-only",
        description: "Checks that the Elasticsearch domain is only available within a VPC, and not accessible via a public endpoint.",
        enforcementLevel: enforcementLevel || defaultEnforcementLevel,
        validateResource: validateResourceOfType(aws.elasticsearch.Domain, (domain, _, reportViolation) => {
            if (domain.vpcOptions === undefined) {
                reportViolation(`Elasticsearch domain ${domain.domainName} must run within a VPC.`);
            }
        }),
    };
}
