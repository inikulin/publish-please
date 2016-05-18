'use strict';

var chalk = require('chalk');
var getNpmArgs = require('./utils/get-npm-args');

function reportError() {
    console.log(chalk.bgRed('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!'));
    console.log(chalk.bgRed('!! `npm publish` is forbidden for this package. !!'));
    console.log(chalk.bgRed('!! Use `npm run publish-please` instead.        !!'));
    console.log(chalk.bgRed('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!'));
}

(function guard() {
    var npmArgs = getNpmArgs();

    if (npmArgs) {
        for (var arg = npmArgs.shift(); arg; arg = npmArgs.shift()) {
            if (/^pu(b(l(i(sh?)?)?)?)?$/.test(arg) && npmArgs.indexOf('--with-publish-please') < 0) {
                reportError();
                process.exit(1);
            }
        }
    } else process.exit(1);
})();