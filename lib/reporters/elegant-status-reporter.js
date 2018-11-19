'use strict';
/**
 * Why there is no import of third-party modules at the root of this file?
 * Required modules may not be available at some point
 * of the publish-please module lifecycle.
 * Requiring those modules at first will break the publish-please execution
 * because reporter's code will be the first to execute
 */

/**
 * elegant status reporter.
 * @module reporters/elegant-status-reporter
 */

module.exports = {
    /**
     * name of the reporter. Must be unique among all reporters.
     */
    name: 'elegant-status',
    /**
     * Check if this reporter can be used.
     * @returns {boolean} returns true if this reporter can be used.
     * false otherwise
     */
    canRun() {
        try {
            const chalk = require('chalk');
            const emoji = require('node-emoji').emoji;
            const isCI = require('./env-type').isCI();
            return (
                typeof chalk === 'function' &&
                typeof chalk.inverse === 'function' &&
                typeof chalk.red === 'function' &&
                typeof chalk.green === 'function' &&
                emoji['+1'] !== undefined &&
                typeof isCI === 'boolean'
            );
        } catch (_error) {
            return false;
        }
    },
    /**
     * Check if this reporter should be used
     * @returns {boolean} returns true if this reporter should be used
     * To make this reporter the default one, this method must return true unconditionnaly
     */
    shouldRun() {
        const isCI = require('./env-type').isCI();
        return isCI === false;
    },
    reportAsIs,
    reportError,
    reportInformation,
    reportRunningSequence,
    reportRunningTask,
    reportStep,
    reportSucceededSequence,
    reportSucceededProcess,
    reportSuccess,
    formatAsElegantPath,
};

/**
 * report error message
 * @param {string} message - error message to be reported
 */
function reportError(message) {
    const chalk = require('chalk');
    console.log(chalk.red(message));
}

/**
 * report a task that is executing and may take some time
 * @param {string} taskname
 * @returns {function(boolean): void} done - returns a function to be called when task has finished processing
 * done(true) -> report success
 * done(false) -> report failure
 */
function reportRunningTask(taskname) {
    const elegantStatus = require('elegant-status');
    return elegantStatus(taskname);
}

/**
 * report success message
 * @param {string} message - success message to be reported
 */
function reportSuccess(message) {
    const chalk = require('chalk');
    console.log(chalk.green(message));
    console.log('');
}

/**
 * report information message
 * @param {string} message - information message to be reported
 */
function reportInformation(message) {
    const chalk = require('chalk');
    console.log(chalk.inverse(message));
}

/**
 * report step message
 * @param {string} message - step message to be reported
 */
function reportStep(message) {
    const chalk = require('chalk');
    console.log(chalk.blue(message));
}

/**
 * report message without doing any extra formatting
 * @param {string} message - message to be reported
 */
function reportAsIs(message) {
    console.log(message);
}

/**
 * report a new running sequence
 * A running sequence is composed of one or more steps
 * Each step in a sequence may be reported by:
 *      reportStep if the step is synchronous
 *      reportRunningTask if the step is asynchronous
 * @param {string} message - name of the sequence to be reported
 */
function reportRunningSequence(message) {
    const chalk = require('chalk');
    console.log(chalk.yellow(message));
    console.log(chalk.yellow('-------------------------'));
}

/**
 * report a successful execution of a sequence
 * A running sequence is composed of one or more steps
 * Each step in a sequence may be reported by:
 *      reportStep if the step is synchronous
 *      reportRunningTask if the step is asynchronous
 * @param {string} message - name of the sequence to be reported
 */
// eslint-disable-next-line no-unused-vars
function reportSucceededSequence(_message) {
    const chalk = require('chalk');
    const emoji = require('node-emoji').emoji;
    console.log(chalk.yellow('-------------------'));
    console.log(emoji['+1'], emoji['+1'], emoji['+1']);
    console.log('');
}

/**
 * report a successful execution of a process
 * @param {string} message
 */
// eslint-disable-next-line no-unused-vars
function reportSucceededProcess(_message) {
    const emoji = require('node-emoji').emoji;
    console.log('');
    console.log(emoji.tada, emoji.tada, emoji.tada);
}

/**
 * format input path
 * @param {string} path
 * @param {string} sep - path separator
 */
function formatAsElegantPath(path, sep) {
    const chalk = require('chalk');
    const packages = path.split(sep);
    const lastIndex = packages.length - 1;

    // prettier-ignore
    const result = packages.map(item => item.trim()).map((item, index) => {
        return index === lastIndex ? chalk.red.bold(item) : item;
    }).join(' -> ');
    return result;
}
