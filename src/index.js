'use strict';

const chalk = require('chalk');
const executionContext = require('./utils/execution-context');

module.exports = function() {
    if (process.argv.indexOf('guard') > -1) {
        require('./guard');
        return;
    }

    if (process.argv.indexOf('config') > -1) {
        const config = require('./config');
        config.configurePublishPlease.inCurrentProject();
        return;
    }

    require('../lib/publish/publish-workflow')().catch((err) => {
        console.log(chalk.red.bold('ERRORS'));
        console.log(err.message);
        if (executionContext && executionContext.isInTestMode()) {
            return;
        }
        process.exit(1);
    });
};
