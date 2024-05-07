// Copyright 2016-2024, Pulumi Corporation.
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
    ReportViolation,
    StackValidationArgs,
    StackValidationPolicy,
} from "@pulumi/policy";

import { registerPolicy } from "./awsGuard";

// Mixin additional properties onto AwsGuardArgs.
declare module "./awsGuard" {
    interface AwsGuardArgs {
        iamRoleNoPolicyManagementConflicts?: EnforcementLevel;
    }
}


/** @internal */
// Enforce the note on aws.iam.Role:
//
// NOTE: If you use this resource’s managed_policy_arns argument or inline_policy configuration blocks, this resource
// will take over exclusive management of the role's respective policy types (e.g., both policy types if both arguments
// are used). These arguments are incompatible with other ways of managing a role's policies, such as
// aws.iam.PolicyAttachment, aws.iam.RolePolicyAttachment, and aws.iam.RolePolicy. If you attempt to manage a role’s
// policies by multiple means, you will get resource cycling and/or errors.
export const iamRoleNoPolicyManagementConflicts: StackValidationPolicy = {
    name: "iam-role-no-policy-management-conflicts",
    description: "Checks that iam.Role resources do not conflict with iam.PolicyAttachment, iam.RolePolicyAttachment, iam.RolePolicy",
    validateStack: (args: StackValidationArgs, reportViolation: ReportViolation) => {
        args.resources.forEach(r => {
            let roleProp: string;
            let currentType: string;
            switch (r.type) {
                case "aws:iam/policyAttachment:PolicyAttachment": {
                    roleProp = "roles";
                    currentType = "PolicyAttachment";
                    break;
                }
                case "aws:iam/rolePolicyAttachment:RolePolicyAttachment": {
                    roleProp = "role";
                    currentType = "RolePolicyAttachment";
                    break;
                }
                case "aws:iam/rolePolicy:RolePolicy": {
                    roleProp = "role";
                    currentType = "RolePolicy";
                    break;
                }
                default: {
                    return;
                }
            }

            if (r.propertyDependencies[roleProp]) {
                r.propertyDependencies[roleProp].forEach(dep => {
                    if (dep.type !== "aws:iam/role:Role" || !dep.props) {
                        return;
                    }
                    if (dep.props["managedPolicyArns"] && dep.props["managedPolicyArns"].length > 0) {
                        reportViolation(`${currentType} should not be used with a role ${dep.urn} that defines managedPolicyArns`, r.urn);
                    }
                    if (dep.props["inlinePolicies"] && dep.props["inlinePolicies"].length > 0) {
                        reportViolation(`${currentType} should not be used with a role ${dep.urn} that defines inlinePolicies ${JSON.stringify(dep.props["inlinePolicies"])}`, r.urn);
                    }
                });
            }
            return;
        });
    },
};

registerPolicy("iamRoleNoPolicyManagementConflicts", iamRoleNoPolicyManagementConflicts);
