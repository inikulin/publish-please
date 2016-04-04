'use strict';

const chalk = require('chalk');

// NOTE: the following code was partially adopted from https://github.com/iarna/in-publish
let npmArgv = null;

try {
    npmArgv = JSON.parse(process.env['npm_config_argv']);
}
catch (err) {
    process.exit(0);
}

if (typeof npmArgv !== 'object' || !npmArgv.cooked || !Array.isArray(npmArgv.cooked))
    process.exit(1);

for (let arg = npmArgv.cooked.shift(); arg; arg = npmArgv.cooked.shift()) {
    if (/^pu(b(l(i(sh?)?)?)?)?$/.test(arg) && npmArgv.cooked.indexOf('--with-publish-please') < 0) {
        console.log(chalk.bgRed('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!'));
        console.log(chalk.bgRed('!! `npm publish` is forbidden for this package. Use `npm run publish` instead. !!'));
        console.log(chalk.bgRed('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!'));
        process.exit(1);
    }
}
