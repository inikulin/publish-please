'use strict';

/**
 * CI reporter.
 * @module reporters/ci-reporter
 */
module.exports = {
    /**
     * name of the reporter. Must be unique among all reporters.
     */
    name: 'ci',
    /**
     * Check if this reporter can be used.
     * @returns {boolean} returns true if this reporter can be used.
     * false otherwise
     */
    canRun() {
        try {
            const getNpmArgs = require('../utils/get-npm-args');
            const getNpxArgs = require('../utils/get-npx-args');
            return (
                typeof getNpmArgs === 'function' &&
                typeof getNpxArgs === 'function'
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
        const getNpmArgs = require('../utils/get-npm-args');
        const getNpxArgs = require('../utils/get-npx-args');
        const npmArgs = getNpmArgs(process.env);
        const npxArgs = getNpxArgs(process);
        if (npmArgs && npmArgs['--ci']) {
            return true;
        }
        if (npxArgs && npxArgs['--ci']) {
            return true;
        }
        return false;
    },
    error,
};

/**
 * report error message
 * @param {string} message - error message to be reported
 */
function error(message) {
    console.log(message);
}
