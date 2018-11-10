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
            return (
                typeof chalk === 'function' &&
                typeof chalk.inverse === 'function' &&
                typeof chalk.bgRed === 'function'
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
        return true;
    },
    reportError,
    reportRunningTask,
};

/**
 * report error message
 * @param {string} message - error message to be reported
 */
function reportError(message) {
    const chalk = require('chalk');
    console.log(chalk.bgRed(message));
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
