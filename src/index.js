'use strict';

// Lifecycle events Cheat sheet: https://gist.github.com/HyperBrain/50d38027a8f57778d5b0f135d80ea406
const { addAliases, addAPIGatewayConfig } = require('./cloudFormationBuilder');
const PLUGIN_CONFIG_KEY = 'simpleAlias';
const PLUGIN_NAME = 'serverless-simple-alias';

const DEFAULT_CONFIG = {
  activeAliasName: 'ACTIVE',
  useActiveAliasInGateway: true,
  makeLambdasActive: true,
};

class ResolveStageVars {
  constructor(serverless) {
    this.serverless = serverless;

    this.validateConfig();

    this.hooks = {
      'before:package:finalize': this.updateCloudFormation.bind(this),
    };
  }

  validateConfig() {
    const customConfig = this.serverless.service.custom;
    if (!customConfig) {
      this.throwError('Missing custom configuration object');
    }

    // Read the global config for the plugin.
    const config = customConfig[PLUGIN_CONFIG_KEY];

    if (!config) {
      this.throwError(`Missing custom.${PLUGIN_CONFIG_KEY} configuration object`);
    }

    const newConfig = { ...DEFAULT_CONFIG, ...config };

    // Verify that there is an activeAlias name
    if (!newConfig.activeAliasName) {
      this.throwError(`Missing custom.${PLUGIN_CONFIG_KEY}.activeAliasName property`);
    }
  }

  updateCloudFormation() {
    const config = { ...DEFAULT_CONFIG, ...this.serverless.service.custom[PLUGIN_CONFIG_KEY] };

    if (config.makeLambdasActive === true) {
      config.aliases.push(config.activeAliasName);
    }

    const cfResources = this.serverless.service.provider.compiledCloudFormationTemplate;
    const compiledResources = cfResources.Resources;

    // Add aliases to the resource map
    cfResources.Resources = {
      ...cfResources.Resources,
      ...addAliases(config.aliases, compiledResources, config.activeAliasName),
    };

    // If we should modify API Gateway, add the API Gateway config
    if (config.useActiveAliasInGateway) {
      cfResources.Resources = {
        ...cfResources.Resources,
        ...addAPIGatewayConfig(config.activeAliasName, compiledResources),
      };
    }

    // console.log(cfResources.Resources);
    // console.log(Object.keys(cfResources.Resources));
    // console.log(Object.keys(cfResources.Resources).length);
  }

  /**
   * Utility function which throws an error.
   * Error message will be prefixed with ${PLUGIN_NAME}: ERROR:
   */
  throwError(msg) {
    const err_msg = `${PLUGIN_NAME}: ERROR: ${msg}`;
    throw new this.serverless.classes.Error(err_msg);
  }
}

module.exports = ResolveStageVars;
