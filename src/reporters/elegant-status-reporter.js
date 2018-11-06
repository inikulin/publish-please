'use strict';
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
    error,
};

/**
 * report error message
 * @param {string} message - error message to be reported
 */
function error(message) {
    const chalk = require('chalk');
    console.log(chalk.bgRed(message));
}
