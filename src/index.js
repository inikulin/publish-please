const chalk = require('chalk');

if (process.argv.indexOf('guard') > -1) require('./guard');
else if (process.argv.indexOf('config') > -1) {
    const config = require('./config');
    config.configurePublishPlease.inCurrentProject();
} else {
    require('../lib/publish')().catch((err) => {
        console.log(chalk.red.bold('ERRORS'));
        console.log(err.message);
        process.exit(1);
    });
}
