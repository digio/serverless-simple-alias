module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2018,
  },

  env: {
    node: true,
  },

  extends: ['plugin:prettier/recommended', 'plugin:unicorn/recommended'],
  rules: {
    // Allow some flexibility here
    'unicorn/prevent-abbreviations': 'off',

    // Use camelCase for files (and directories - not enforced)
    'unicorn/filename-case': ['error', { case: 'camelCase' }],

    // Turn off explicit length checks
    'unicorn/explicit-length-check': 'off',

    // Turning off because it leads to many uses of the word 'error' in the same block, which is confusing
    // E.g.
    // } catch(error) {
    //   logger.error(error);
    //   return error(error);
    // }
    'unicorn/catch-error-name': 'off',

    // This rule is no good for test specs. Need to find a way to disable this for test specs
    'unicorn/consistent-function-scoping': 'off',

    // Turn off this rule is makes the code IN THIS REPO harder to read
    'unicorn/import-index': 'off',

    // Not convinced that this is the right approach
    'unicorn/no-reduce': 'off',
  },
};
