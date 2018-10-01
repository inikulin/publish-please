'use strict';

const chalk = require('chalk');

module.exports = function showValidationErrors(err) {
    console.log(chalk.red.bold('ERRORS'));
    console.log(err.message);
    console.log('');
};
