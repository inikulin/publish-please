const chalk = require('chalk');
const executionContext = require('./utils/execution-context');

if (process.argv.indexOf('guard') > -1) require('./guard');
else if (process.argv.indexOf('config') > -1) {
    const config = require('./config');
    config.configurePublishPlease.inCurrentProject();
} else {
    require('../lib/publish/publish-workflow')().catch((err) => {
        console.log(chalk.red.bold('ERRORS'));
        console.log(err.message);
        if (executionContext && executionContext.isInTestMode()) {
            return Promise.resolve(false);
        }
        process.exit(1);
    });
}
