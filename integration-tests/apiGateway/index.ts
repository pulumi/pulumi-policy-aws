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
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();
const testScenario = config.getNumber("scenario");

console.log(`Running test scenario #${testScenario}`);

// Change the endpoint type based on test scenario.
const endpointType = (testScenario >= 2 ? "EDGE" : "REGIONAL");

// This test is a little strange, in that it runs through scenarios using the underlying AWS
// resource provider resources. When in practice you'll want to use the higher-level Pulumi
// Crosswalk for AWS. (@pulumi/awsx) See:
// https://www.pulumi.com/docs/guides/crosswalk/aws/api-gateway/
const restApiArgs: aws.apigateway.RestApiArgs = {
    endpointConfiguration: {
        types: endpointType,
    },
    tags: {
        "origin": "Testing pulumi-policy-aws. Safe to delete.",
    }
};
const restApi = new aws.apigateway.RestApi("restApi", restApiArgs);

const resourceArgs: aws.apigateway.ResourceArgs = {
    restApi: restApi,
    parentId: restApi.rootResourceId,
    pathPart: "r",
};
const resource = new aws.apigateway.Resource("resource", resourceArgs);

const methodArgs: aws.apigateway.MethodArgs = {
    resourceId: resource.id,
    restApi: restApi,
    httpMethod: "GET",
    requestParameters: {},
    authorization: "NONE",
};
const method = new aws.apigateway.Method("method", methodArgs);

const integration = new aws.apigateway.Integration("integration", {
     httpMethod: method.httpMethod,
     requestTemplates: {
         "application/xml": `{
    "body" : $input.json('$')
 }
 `,
     },
     resourceId: resource.id,
     restApi: restApi,
     type: "MOCK",
 });

const deploymentArgs: aws.apigateway.DeploymentArgs = {
    restApi: restApi,
    stageName: "dev",
};
const deployment = new aws.apigateway.Deployment("deployment", deploymentArgs, {
    dependsOn: [integration],
});

// Stage settings dependent on the test scenario.
const cacheClusterEnabled = (testScenario >= 2);
const cacheClusterSize = (testScenario >= 2 ? "6.1" : undefined);

const stageArgs: aws.apigateway.StageArgs = {
    restApi: restApi,
    cacheClusterEnabled: cacheClusterEnabled,
    cacheClusterSize: cacheClusterSize,
    stageName: "prod",
    deployment: deployment,
};
const stage = new aws.apigateway.Stage("stage", stageArgs, {
    dependsOn: deployment,
});

// Configure the method's settings based on test scenario.
const methodCachingEnabled = (testScenario >= 3 ? true : false);
const methodCacheEncrypted = (testScenario >= 3 ? true : false);

const methodSettingsArgs: aws.apigateway.MethodSettingsArgs = {
    methodPath: pulumi.interpolate `${resource.pathPart}/${method.httpMethod}`,
    restApi: restApi,
    stageName: stage.stageName,
    settings: {
        cachingEnabled: methodCachingEnabled,
        cacheDataEncrypted: methodCacheEncrypted,

        metricsEnabled: true,
        loggingLevel: "INFO",
        
    },
}
const methodSettings = new aws.apigateway.MethodSettings("methodSettings", methodSettingsArgs);
