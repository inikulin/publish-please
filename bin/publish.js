#!/usr/bin/env node

const chalk   = require('chalk');
const publish = require('../lib/publish');

publish().catch(err => {
    console.log(chalk.red.bold('ERRORS'));
    console.log(err.message);
    process.exit(1);
});
