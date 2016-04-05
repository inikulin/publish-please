'use strict';

const chalk = require('chalk');

function getNpmArgs () {
    // NOTE: the following code was partially adopted from https://github.com/iarna/in-publish
    let npmArgv = null;

    try {
        npmArgv = JSON.parse(process.env['npm_config_argv']);
    }
    catch (err) {
        return null;
    }

    if (typeof npmArgv !== 'object' || !npmArgv.cooked || !Array.isArray(npmArgv.cooked))
        return null;

    return npmArgv.cooked;
}

function reportError () {
    console.log(chalk.bgRed('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!'));
    console.log(chalk.bgRed('!! `npm publish` is forbidden for this package. !!'));
    console.log(chalk.bgRed('!! Use `npm run publish-please` instead.        !!'));
    console.log(chalk.bgRed('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!'));
}

(function guard () {
    const npmArgs = getNpmArgs();

    if (npmArgs) {
        for (let arg = npmArgs.shift(); arg; arg = npmArgs.shift()) {
            if (/^pu(b(l(i(sh?)?)?)?)?$/.test(arg) && npmArgs.indexOf('--with-publish-please') < 0) {
                reportError();
                process.exit(1);
            }
        }
    }
    else
        process.exit(1);
})();
