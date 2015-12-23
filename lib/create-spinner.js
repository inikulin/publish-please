'use strict';

const elegantSpinner = require('elegant-spinner');
const logUpdate      = require('log-update');
const chalk          = require('chalk');
const noop           = require('noop-fn');
const OS             = require('os-family');


module.exports = function createSpinner (text, testMode) {
    if (testMode)
        return noop;

    const frame     = elegantSpinner();
    const animation = setInterval(() => logUpdate(chalk.yellow(frame()) + ' ' + text), 50);

    animation.unref();

    return ok => {
        const status = ok ?
                       chalk.green(OS.win ? '√' : '✓') :
                       chalk.red(OS.win ? '×' : '✖');

        clearInterval(animation);
        logUpdate(status + ' ' + text);
        console.log();
    };
};
