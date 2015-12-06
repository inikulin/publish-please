#!/usr/bin/env node

var chalk   = require('chalk');
var publish = require('../lib');

publish().catch(function (err) {
    console.log(chalk.red.bold('ERRORS'));
    console.log(err.message);
    process.exit(1)
});
