# Serverless Simple Alias Plugin

[![serverless][sls-image]][sls-url]
[![npm package][npm-image]][npm-url]
[![Build Status][travis-image]][travis-url]
[![Coverage Status][coveralls-image]][coveralls-url]
[![Downloads][downloads-image]][npm-url]

A Serverless plugin to create AWS Lambda aliases without imposing a way-of-working with them. 

## Motivation

The existing Serverless [alias-plugin][complex-plugin] presumes/enforces a way of working that may
be more complex than you require.

This plugin assists with two use cases:
1. Creating an "active" alias, and using that alias in API Gateway.
2. Allowing _any_ other alias to be applied to the functions in the Serverless config.

## Installation

```
npm install --save-dev serverless-simple-alias
```

Add the plugin to serverless.yml:

```yaml
plugins:
  - serverless-simple-alias
```

**Note**: Node 10.x or higher runtime required.

## Usage

Inside your Serverless config, include this plugin and define a `custom.simpleAlias` object and specify the activeAliasName
**This configuration is optional.** If no configuration is specified, default values will be used.

```yaml
plugins:
  - serverless-simple-alias
  ...

custom:
  simpleAlias:
    activeAliasName: 'ACTIVE'  # Default: 'ACTIVE'
    useActiveAliasInGateway: true   # Default: true. Whether to change API Gateway to target the active alias or not
    makeLambdasActive: true  # Default: true. Whether to apply the active alias to the lambdas that are being deployed now. Could vary per environment.
    aliases: # An array of additional aliases to apply when deploying the Lambda functions
      - '${self:provider.environment.packageVersion}`
    
```

In practice, different environments have different deployment requirements. For example, in production it
may be preferable to not deploy the new versions of the Lambdas with the active tag.

## How it works

This plugin changes the following generated AWS CloudFormation templates:
- Adds an `AWS::Lambda::Alias` resource for each alias, per function, and links each resource to the corresponding `AWS::Function::Version` resource.
- Changes the existing `AWS::ApiGateway::Method` resources (that have `Property.Integration.Type` of `AWS_PROXY`) to
  include the active-alias name in the `Property.Integration.Uri`
- Changes the existing `AWS::Lambda::Permission` resources to point the `Properties.FunctionName` to the `AWS::Lambda::Alias` resource.

[sls-image]: http://public.serverless.com/badges/v3.svg
[sls-url]: http://www.serverless.com
[npm-image]: https://img.shields.io/npm/v/serverless-simple-alias.svg
[npm-url]: http://npmjs.org/package/serverless-simple-alias
[travis-image]: https://travis-ci.org/digio/serverless-simple-alias.svg?branch=master
[travis-url]: https://travis-ci.org/digio/serverless-simple-alias
[coveralls-image]: https://coveralls.io/repos/github/digio/serverless-simple-alias/badge.svg?branch=master
[coveralls-url]: https://coveralls.io/github/digio/serverless-simple-alias?branch=master
[downloads-image]: https://img.shields.io/npm/dm/serverless-simple-alias.svg

[complex-plugin]: https://github.com/serverless-heaven/serverless-aws-alias
