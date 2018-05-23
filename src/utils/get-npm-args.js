'use strict';

// NOTE: the following code was partially adopted from https://github.com/iarna/in-publish
module.exports = function getNpmArgs(processEnv) {
    const npmArgs = {};
    if (processEnv && processEnv['npm_config_argv']) {
        try {
            const args = JSON.parse(processEnv['npm_config_argv']);
            // console.log(processEnv['npm_config_argv']);
            npmArgs.install =
                npmCommand(args).hasArg('install') ||
                npmCommand(args).hasArg('i');
            npmArgs.publish = npmCommand(args).hasArg('publish');
            npmArgs['--save-dev'] = npmCommand(args).hasArg('--save-dev');
            npmArgs['--save'] = npmCommand(args).hasArg('--save');
            npmArgs['--global'] = npmCommand(args).hasArg('--global');
            // prettier-ignore
            npmArgs['--with-publish-please'] = npmCommand(args).hasArg('--with-publish-please');
        } catch (err) {
            console.warn(
                "[Publish-please] Cannot parse property 'npm_config_argv' in process.env "
            );
            // prettier-ignore
            console.warn(
                `[Publish-please] process.env['npm_config_argv']= '${processEnv['npm_config_argv']}'`
            );
        }
    }

    return npmArgs;
};

const npmCommand = (args) => {
    const isValidArgs = args && args.cooked && Array.isArray(args.cooked);
    return {
        hasArg: (arg) => {
            return isValidArgs
                ? args.cooked.filter((a) => a === arg).length > 0
                : false;
        },
    };
};
