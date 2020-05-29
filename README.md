[![Build Status](https://travis-ci.com/pulumi/pulumi-policy-aws.svg?branch=master)](https://travis-ci.com/pulumi/pulumi-policy-aws)

# Pulumi CrossGuard policies for AWS (Preview)

**NOTE:** This library is part of Pulumi's Policy as Code offering. It is currently being previewed and is subject to breaking changes. We've included an initial set of policies for AWS and are in the process of adding many more.

---

## Overview

AWSGuard codifies best practices for AWS. This is a configurable library that you can use to enforce these best practices for your own Pulumi stacks or organization.

For more information on Pulumi's Policy as Code solution, visit our [docs](https://www.pulumi.com/docs/get-started/policy-as-code/).

## Trying AWSGuard

In this guide, we'll show you how to create a Policy Pack that configures and uses the policies available in AWSGuard.

### Prerequisites

- [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
- [Install Node.js](https://nodejs.org/en/download/)

### Verify your version of the Pulumi CLI

```sh
pulumi version # should be v2.0.0 or later
```

### Authoring a Policy Pack that uses AWSGuard policies

To use AWSGuard policies, you must create a Policy Pack that references the `@pulumi/awsguard` npm package and in the implementation of the Policy Pack, create a new instance of the `AwsGuard` class.

1. Create a directory for your new Policy Pack, and change into it.

    ```sh
    mkdir awsguard && cd awsguard
    ```

2. Run the `pulumi policy new` command.

    ```sh
    pulumi policy new awsguard-typescript
    ```

3. Tweak the code in the `index.ts` file as desired. The default implementation provided by the `awsguard-typescript` template simply creates a new instance of `AwsGuard` with all policies set to have an enforcement level of advisory.

    ```typescript
    new AwsGuard({ all: "advisory" });
    ```

    From here, you can change the enforcement level for all policies or configure individual policies.

    For example:

    To make all policies mandatory rather than advisory:

    ```typescript
    new AwsGuard({ all: "mandatory" });
    ```

    To make all policies mandatory, but change certain policies to be advisory:

    ```typescript
    new AwsGuard({
        all: "mandatory",
        ec2InstanceNoPublicIP: "advisory",
        elbAccessLoggingEnabled: "advisory",
    });
    ```

    To disable a particular policy:

    ```typescript
    new AwsGuard({
        ec2InstanceNoPublicIP: "disabled",
    });
    ```

    To disable all policies except ones explicitly enabled:

    ```typescript
    new AwsGuard({
        all: "disabled",
        ec2InstanceNoPublicIP: "mandatory",
        elbAccessLoggingEnabled: "mandatory",
    });
    ```

    To specify additional configuration for policies that support it:

    ```typescript
    new AwsGuard({
        ec2VolumeInUse: { checkDeletion: false },
        encryptedVolumes: { enforcementLevel: "mandatory", kmsId: "id" },
        redshiftClusterMaintenanceSettings: { preferredMaintenanceWindow: "Mon:09:30-Mon:10:00" },
        acmCertificateExpiration: { maxDaysUntilExpiration: 10 },
    });
    ```

### Test the new Policy Pack

Policy Packs can be tested on a user's local workstation to facilitate rapid development and testing of policies.

1. Run `npm install` in the Policy Pack directory.

1. Use the `--policy-pack` flag with `pulumi preview` or `pulumi up` to specify the path to the directory containing your Policy Pack when previewing/updating a Pulumi program.

    If you don’t have a Pulumi program readily available, you can create a new project for testing by running `pulumi new aws-typescript` in an empty directory. This AWS example will create an S3 bucket, which is perfect for testing our Policy.

    In the Pulumi project's directory run:

    ```sh
    pulumi preview --policy-pack <path-to-policy-pack-directory>
    ```

    If the stack is not in compliance, the policy violation will be displayed. Since the enforcement level for all policies are set to advisory, a warning is shown for any resources that are not in compliance with the AWSGuard policies. In this case, logging must be defined for S3 buckets.

    ```
    Previewing update (dev):

        Type                 Name           Plan       Info
    +   pulumi:pulumi:Stack  test-dev       create
    +   └─ aws:s3:Bucket     my-bucket      create     1 warning

    Policy Violations:
        [advisory]  pulumi-awsguard v0.0.1  s3-bucket-logging-enabled (my-bucket: aws:s3/bucket:Bucket)
        Checks whether logging is enabled for your S3 buckets.
        Bucket logging must be defined.
    ```

1. If you had wanted the preview to fail for any policy violations, the Policy Pack can be modified to configure all policies to be mandatory.

    ```typescript
    new AwsGuard({ all: "mandatory" });
    ```

1. Running the `pulumi preview` command again will now fail the preview operation.

    ```
    Previewing update (dev):

        Type                 Name           Plan       Info
    +   pulumi:pulumi:Stack  test-dev       create     1 error
    +   └─ aws:s3:Bucket     my-bucket      create     1 error

    Diagnostics:
      pulumi:pulumi:Stack (test-dev):
        error: preview failed

    Policy Violations:
        [mandatory]  pulumi-awsguard v0.0.1  s3-bucket-logging-enabled (my-bucket: aws:s3/bucket:Bucket)
        Checks whether logging is enabled for your S3 buckets.
        Bucket logging must be defined.
    ```

1. If you do not want to enforce this particular policy, you can modify the Policy Pack to disable it.

    ```typescript
    new AwsGuard({
        all: "mandatory",
        s3BucketLoggingEnabled: "disabled",
    });
    ```
