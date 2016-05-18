'use strict';

var chalk = require('chalk');

if (process.argv.indexOf('guard') > -1) require('./guard');else if (process.argv.indexOf('config') > -1) require('./config')();else {
    require('../lib/publish')().catch(function (err) {
        console.log(chalk.red.bold('ERRORS'));
        console.log(err.message);
        process.exit(1);
    });
}