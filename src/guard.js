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

(function guard(processEnv) {
    const npmArgs = getNpmArgs(processEnv);

    if (npmArgs && npmArgs.publish && !npmArgs['--with-publish-please']) {
        reportError();
        process.exit(1);
    }

    process.exit(0);
})(process.env);
