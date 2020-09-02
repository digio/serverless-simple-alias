const Plugin = require('./index.js');
const slsConfig = require('../fixtures/serverless.correct.json');

function getConfig() {
  const config = JSON.parse(JSON.stringify(slsConfig)); // cheap deep copy

  // Mock the config.classes.Error class
  config.classes = {
    Error: Error,
  };

  return config;
}

function getResources(config, type) {
  const compiledResources = config.service.provider.compiledCloudFormationTemplate.Resources;
  return Object.entries(compiledResources).filter(([, resource]) => resource.Type === type);
}

describe('Serverless Simple Alias Plugin', () => {
  describe('initialisation', () => {
    it('should throw an error if there is no custom configuration object', () => {
      const config = getConfig();
      delete config.service.custom;

      expect(() => new Plugin(config)).toThrowError('Missing custom configuration object');
    });

    it('should throw an error if there is no custom configuration object with a simpleAlias prop', () => {
      const config = getConfig();
      delete config.service.custom.simpleAlias;

      expect(() => new Plugin(config)).toThrowError('Missing custom.simpleAlias configuration object');
    });

    it('should throw an error if there is no activeAlias prop', () => {
      const config = getConfig();
      config.service.custom.simpleAlias.activeAliasName = '';

      expect(() => new Plugin(config)).toThrowError('Missing custom.simpleAlias.activeAliasName property');
    });
  });

  describe('updateCloudFormation()', () => {
    it('should not create a Lambda Alias when makeLambdasActive is false', () => {
      const config = getConfig();
      config.service.custom.simpleAlias = {
        activeAliasName: 'LIVE',
        useActiveAliasInGateway: false,
        makeLambdasActive: false,
        aliases: [],
      };
      const plugin = new Plugin(config);

      // BEFORE
      const initialAliases = getResources(config, 'AWS::Lambda::Alias');
      expect(initialAliases.length).toEqual(0);
      const initialFunctions = getResources(config, 'AWS::Lambda::Function');
      expect(initialFunctions.length).toEqual(2);

      plugin.updateCloudFormation();

      // AFTER
      const actualAliases = getResources(config, 'AWS::Lambda::Alias');
      expect(actualAliases.length).toEqual(0); // <--- no aliases created
      const actualFunctions = getResources(config, 'AWS::Lambda::Function');
      expect(actualFunctions.length).toEqual(2);
    });

    it('should create a Lambda Alias using the "active" alias when makeLambdasActive is true', () => {
      const config = getConfig();
      config.service.custom.simpleAlias = {
        activeAliasName: 'LIVE',
        useActiveAliasInGateway: false,
        makeLambdasActive: true,
        aliases: [],
      };
      const plugin = new Plugin(config);

      // BEFORE
      const initialAliases = getResources(config, 'AWS::Lambda::Alias');
      expect(initialAliases.length).toEqual(0);
      const initialFunctions = getResources(config, 'AWS::Lambda::Function');
      expect(initialFunctions.length).toEqual(2);

      plugin.updateCloudFormation();

      // AFTER
      const actualAliases = getResources(config, 'AWS::Lambda::Alias');
      expect(actualAliases.length).toEqual(2);
      const actualFunctions = getResources(config, 'AWS::Lambda::Function');
      expect(actualFunctions.length).toEqual(2);

      expect(actualAliases).toMatchInlineSnapshot(`
        Array [
          Array [
            "WebHookLambdaFunctionAlias",
            Object {
              "DependsOn": Array [
                "WebHookLambdaFunction",
              ],
              "Properties": Object {
                "FunctionName": Object {
                  "Fn::GetAtt": Array [
                    "WebHookLambdaFunction",
                    "Arn",
                  ],
                },
                "FunctionVersion": Object {
                  "Fn::GetAtt": Array [
                    "WebHookLambdaFunctionJNcivYNMb6OXh1g6GW5oLreszRH5VgX9cPOshMeCro",
                    "Version",
                  ],
                },
                "Name": "LIVE",
              },
              "Type": "AWS::Lambda::Alias",
            },
          ],
          Array [
            "FooLambdaFunctionAlias",
            Object {
              "DependsOn": Array [
                "FooLambdaFunction",
              ],
              "Properties": Object {
                "FunctionName": Object {
                  "Fn::GetAtt": Array [
                    "FooLambdaFunction",
                    "Arn",
                  ],
                },
                "FunctionVersion": Object {
                  "Fn::GetAtt": Array [
                    "FooLambdaFunctionJNcivYNMb6OXh1g6GW5oLreszRH5VgX9cPOshMeCro",
                    "Version",
                  ],
                },
                "Name": "LIVE",
              },
              "Type": "AWS::Lambda::Alias",
            },
          ],
        ]
      `);
    });

    it('should create many Lambda Aliases when makeLambdasActive is true and there is an array of aliases', () => {
      const config = getConfig();
      config.service.custom.simpleAlias = {
        activeAliasName: 'LIVE',
        useActiveAliasInGateway: false,
        makeLambdasActive: true,
        aliases: ['alias_a', 'NEW'],
      };
      const plugin = new Plugin(config);

      // BEFORE
      const initialAliases = getResources(config, 'AWS::Lambda::Alias');
      expect(initialAliases.length).toEqual(0);
      const initialFunctions = getResources(config, 'AWS::Lambda::Function');
      expect(initialFunctions.length).toEqual(2);

      plugin.updateCloudFormation();

      // AFTER
      const actualAliases = getResources(config, 'AWS::Lambda::Alias');
      expect(actualAliases.length).toEqual(6); // [active alias, alias_a, NEW] x 2 functions
      const actualFunctions = getResources(config, 'AWS::Lambda::Function');
      expect(actualFunctions.length).toEqual(2);
    });

    it('should modify the API Gateway Methods when useActiveAliasInGateway is true', () => {
      const config = getConfig();
      config.service.custom.simpleAlias = {
        activeAliasName: 'LIVE',
        useActiveAliasInGateway: true,
        makeLambdasActive: true,
        aliases: [],
      };
      const plugin = new Plugin(config);

      // BEFORE
      const initialGatewayMethods = getResources(config, 'AWS::ApiGateway::Method').filter(
        ([, resource]) => resource.Properties.Integration.Type === 'AWS_PROXY'
      );
      expect(initialGatewayMethods.length).toEqual(2);

      const initialPermissions = getResources(config, 'AWS::Lambda::Permission');
      expect(initialPermissions.length).toEqual(2);
      expect(initialPermissions[0][1].Properties.FunctionName['Fn::GetAtt'][0]).toEqual('WebHookLambdaFunction');
      expect(initialPermissions[1][1].Properties.FunctionName['Fn::GetAtt'][0]).toEqual('FooLambdaFunction');

      plugin.updateCloudFormation();

      // AFTER
      const actualGatewayMethods = getResources(config, 'AWS::ApiGateway::Method').filter(
        ([, resource]) => resource.Properties.Integration.Type === 'AWS_PROXY'
      );
      expect(actualGatewayMethods.length).toEqual(2); // Still 2, but we have modified the URI to include the active alias
      expect(actualGatewayMethods[0][1].Properties.Integration.Uri['Fn::Join'][1]).toMatchInlineSnapshot(`
        Array [
          "arn:",
          Object {
            "Ref": "AWS::Partition",
          },
          ":apigateway:",
          Object {
            "Ref": "AWS::Region",
          },
          ":lambda:path/2015-03-31/functions/",
          Object {
            "Fn::GetAtt": Array [
              "WebHookLambdaFunction",
              "Arn",
            ],
          },
          ":LIVE/invocations",
        ]
      `);
      expect(actualGatewayMethods[1][1].Properties.Integration.Uri['Fn::Join'][1]).toMatchInlineSnapshot(`
        Array [
          "arn:",
          Object {
            "Ref": "AWS::Partition",
          },
          ":apigateway:",
          Object {
            "Ref": "AWS::Region",
          },
          ":lambda:path/2015-03-31/functions/",
          Object {
            "Fn::GetAtt": Array [
              "FooLambdaFunction",
              "Arn",
            ],
          },
          ":LIVE/invocations",
        ]
      `);

      const finalPermissions = getResources(config, 'AWS::Lambda::Permission');
      expect(finalPermissions.length).toEqual(2);
      expect(finalPermissions[0][1].Properties.FunctionName.Ref).toEqual('WebHookLambdaFunctionAlias');
      expect(finalPermissions[1][1].Properties.FunctionName.Ref).toEqual('FooLambdaFunctionAlias');
    });
  });
});
