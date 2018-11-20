'use strict';
const pathSeparator = require('path').sep;
const npmCommand = require('./fluent-syntax').npmCommand;
const arg = require('./fluent-syntax').arg;

// NOTE: the following code was partially adopted from https://github.com/iarna/in-publish
module.exports = function getNpmArgs(processEnv) {
    if (arg(processEnv).is(notValid)) {
        return {};
    }
    const npmArgs = {};
    try {
        const args = JSON.parse(processEnv['npm_config_argv']);
        npmArgs.install =
            npmCommand(args).hasArg('install') || npmCommand(args).hasArg('i');
        npmArgs.publish = npmCommand(args).hasArg('publish');
        npmArgs.runScript = npmCommand(args).hasArg('run');
        npmArgs['--save-dev'] = npmCommand(args).hasArg('--save-dev');
        npmArgs['--save'] = npmCommand(args).hasArg('--save');
        npmArgs['--global'] = npmCommand(args).hasArg('--global');
        npmArgs['--dry-run'] = npmCommand(args).hasArg('--dry-run');
        npmArgs['--ci'] = npmCommand(args).hasArg('--ci');
        npmArgs['config'] = npmCommand(args).hasArg('config');
        npmArgs.npx =
            npmCommand(args).hasArg('--prefix') &&
            npmCommand(args).hasArgThatContains(
                `${pathSeparator}_npx${pathSeparator}`
            );
        // prettier-ignore
        npmArgs['--with-publish-please'] = npmCommand(args).hasArg('--with-publish-please');
        // eslint-disable-next-line no-empty
    } catch (err) {}

    return npmArgs;
};

function notValid(processEnv) {
    if (processEnv === null || processEnv === undefined) {
        return true;
    }

    if (processEnv['npm_config_argv'] === undefined) {
        return true;
    }

    if (processEnv['npm_config_argv'] === 'undefined') {
        return true;
    }

    return false;
}
