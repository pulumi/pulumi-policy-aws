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

import "mocha";

import * as aws from "@pulumi/aws";

import * as network from "../network";

import { assertHasResourceViolation, assertNoResourceViolations, createResourceValidationArgs } from "./util";

describe("#albHttpToHttpsRedirection", () => {
    const policy = network.albHttpToHttpsRedirection;

    const loadBalancerArn = "arn:aws:elasticloadbalancing:us-west-2:333333333333:loadbalancer/app/alb-4163fcb/93e140268049384d";

    it("Reports no violations for HTTPS listeners", async () => {
        const args = createResourceValidationArgs(aws.alb.Listener, {
            loadBalancerArn,
            protocol: "HTTPS",
            defaultActions: [],
            port: 443,
        });
        await assertNoResourceViolations(policy, args);
    });

    it("Reports no violations for HTTP-to-HTTPS listeners", async () => {
        const args = createResourceValidationArgs(aws.alb.Listener, {
            loadBalancerArn,
            protocol: "HTTP",
            defaultActions: [
                {
                    redirect: {
                        protocol: "HTTPS",
                        statusCode: "301",
                    },
                    type: "redirect",
                },
            ],
            port: 443,
        });
        await assertNoResourceViolations(policy, args);
    });

    it("Reports a violation if there isn't exactly one default action", async () => {
        {
            const args = createResourceValidationArgs(aws.alb.Listener, {
                loadBalancerArn,
                protocol: "HTTP",
                defaultActions: [ /* error: no default actions */ ],
                port: 80,
            });

            const msg = `HTTP listener has no default actions configured.`;
            await assertHasResourceViolation(policy, args, { message: msg });
        }

        {
            const args = createResourceValidationArgs(aws.alb.Listener, {
                loadBalancerArn,
                protocol: "HTTP",
                defaultActions: [
                    // Error: Two default actions?!?
                    {
                        redirect: {
                            protocol: "HTTPS",
                            statusCode: "HTTP_301",
                        },
                        type: "redirect",
                    },
                    {
                        redirect: {
                            protocol: "HTTPS",
                            statusCode: "HTTP_302",
                        },
                        type: "redirect",
                    },
                ],
                port: 80,
            });

            const msg = `HTTP listener has more than one default action.`;
            await assertHasResourceViolation(policy, args, { message: msg });
        }
    });

    it("Reports a violation if not redirecting to HTTPS", async () => {
        {
            const args = createResourceValidationArgs(aws.alb.Listener, {
                loadBalancerArn,
                protocol: "HTTP",
                defaultActions: [
                    {
                        redirect: {
                            protocol: "HTTP",  // Should be HTTPS.
                            statusCode: "HTTP_301",
                        },
                        type: "redirect",
                    },
                ],
                port: 443,
            });

            const msg = `Default action for HTTP listener must be a redirect using HTTPS.`;
            await assertHasResourceViolation(policy, args, { message: msg });
        }
    });
});
