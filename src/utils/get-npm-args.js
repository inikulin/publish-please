'use strict';
const pathSeparator = require('path').sep;

// NOTE: the following code was partially adopted from https://github.com/iarna/in-publish
module.exports = function getNpmArgs(processEnv) {
    const npmArgs = {};
    if (processEnv && processEnv['npm_config_argv']) {
        try {
            const args = JSON.parse(processEnv['npm_config_argv']);
            npmArgs.install =
                npmCommand(args).hasArg('install') ||
                npmCommand(args).hasArg('i');
            npmArgs.publish = npmCommand(args).hasArg('publish');
            npmArgs.runScript = npmCommand(args).hasArg('run');
            npmArgs['--save-dev'] = npmCommand(args).hasArg('--save-dev');
            npmArgs['--save'] = npmCommand(args).hasArg('--save');
            npmArgs['--global'] = npmCommand(args).hasArg('--global');
            npmArgs['--dry-run'] = npmCommand(args).hasArg('--dry-run');
            npmArgs['config'] = npmCommand(args).hasArg('config');
            npmArgs.npx =
                npmCommand(args).hasArg('--prefix') &&
                npmCommand(args).hasArgThatContains(
                    `${pathSeparator}_npx${pathSeparator}`
                );
            // prettier-ignore
            npmArgs['--with-publish-please'] = npmCommand(args).hasArg('--with-publish-please');
        } catch (err) {
            console.error(
                "[Publish-please] Cannot parse property 'npm_config_argv' in process.env "
            );
            // prettier-ignore
            console.error(
                `[Publish-please] process.env['npm_config_argv']= '${processEnv['npm_config_argv']}'`
            );
            console.error(`[Publish-please] ${err.message}`);
        }
    }

    return npmArgs;
};

function npmCommand(args) {
    const isValidArgs = args && args.cooked && Array.isArray(args.cooked);
    return {
        hasArg: (arg) => {
            return isValidArgs
                ? args.cooked.filter((a) => a === arg).length > 0
                : false;
        },
        hasArgThatContains: (substring) => {
            /* prettier-ignore */
            return isValidArgs
                ? args.cooked.filter((a) => a && a.includes(substring)).length > 0
                : false;
        },
    };
}
