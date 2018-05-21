'use strict';

const noGlobalInstallMessage = `
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!! Starting from v2.0.0 publish-please can't be installed globally.          !!
!! Use local installation instead : 'npm install --save-dev publish-please'. !!
!! (learn more: https://github.com/inikulin/publish-please#readme).          !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
`;

(function preInstallCheck() {
    const chalk = require('chalk');
    const getNpmArgs = require('./utils/get-npm-args');
    const npmArgs = getNpmArgs(process.env);
    if (npmArgs['--global']) {
        reportNoGlobalInstall();
        process.exit(1);
    }

    process.exit(0);

    function reportNoGlobalInstall() {
        console.log(chalk.bgRed(noGlobalInstallMessage));
    }
})();
