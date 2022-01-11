## HEAD (Unreleased)

---

## 0.3.1 (2022-01-11)

- Don't attempt to retrieve ACM certificate from AWS if certificate hasn't been created.
  [#80](https://github.com/pulumi/pulumi-policy-aws/pull/80)

## 0.2.4 (2021-07-05)

- Pass in the aws region for acm certificate. (Thanks @arwilczek90!)
  [#77](https://github.com/pulumi/pulumi-policy-aws/issues/77)

## 0.3.0 (2021-04-22)

- Upgrade to Pulumi v3.0

## 0.2.2 (2020-06-08)

- Add root volume encryption validation to `encrypted-volumes` policy. (Thanks @andrewpurdin!)
  [#68](https://github.com/pulumi/pulumi-policy-aws/pull/68)

## 0.2.1 (2020-05-29)

- Fix TypeScript compiler error when using the library. (Thanks @rsclarke-vgw!)
  [#60](https://github.com/pulumi/pulumi-policy-aws/pull/60)

## 0.2.0 (2020-04-17)

- Use consistent naming of policies.
- Add rdsInstanceMultiAZEnabled policy.
- Upgrade to @pulumi/policy v1.1.0 and @pulumi/pulumi v2.0.0.

## 0.1.0 (2019-11-26)

- Initial preview release.
