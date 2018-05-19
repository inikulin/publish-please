'use strict';

const chalk = require('chalk');
const getNpmArgs = require('./utils/get-npm-args');
const errorMessage = `
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!! 'npm publish' is forbidden for this package. !!
!! Use 'npm run publish-please' instead.        !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
`;

function reportError() {
    console.log(chalk.bgRed(errorMessage));
}

(function guard() {
    const npmArgs = getNpmArgs();

    if (npmArgs) {
        for (let arg = npmArgs.shift(); arg; arg = npmArgs.shift()) {
            if (
                /^pu(b(l(i(sh?)?)?)?)?$/.test(arg) &&
                npmArgs.indexOf('--with-publish-please') < 0
            ) {
                reportError();
                process.exit(1);
            }
        }
    } else process.exit(1);
})();
