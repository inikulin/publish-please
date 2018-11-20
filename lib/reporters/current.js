'use strict';

const elegantStatusReporter = require('./elegant-status-reporter');
const ciReporter = require('./ci-reporter');
const reporters = [elegantStatusReporter, ciReporter];
/**
 * Current Reporter.
 * @module reporters/current
 */
module.exports = {
    /**
     * get current reporter
     * Why the reporter must be re-evaluated at each call?
     * because publish-please module lifecycle is different when called by
     *          `npm install` after a fresh git clone of the publish-please repo
     *          `npm install` after an already installed clone of the publish-please repo
     *          `npm install --save-dev publish-please` on your own repo
     *          `npm install -g publish-please`
     *          `npx publish-please` on your own repo
     *          `npm run publish-please` on your own repo
     * This lifecycle may prevent the 'elegant-status-reporter' to be available for a short period of time
     * During this short period of time the 'elegant-status-reporter' will automatically fall back to the 'ci-reporter'
     * @returns {Reporter}
     */
    current() {
        try {
            const selectedReporter = reporters
                .filter((reporter) => reporter.canRun())
                .filter((reporter) => reporter.shouldRun())
                .pop();
            return selectedReporter || ciReporter;
        } catch (error) {
            return ciReporter;
        }
    },
};

/**
 * @typedef Reporter
 * @type {Object}
 * @property {string} name - name of the reporter. Must be unique among all reporters.
 * @property {function(): boolean} canRun - Check if this reporter can be used.
 * @property {function(): boolean} shouldRun - Check if this reporter should be used
 * @property {function(string): void} reportAsIs - report message without doing any extra formatting
 * @property {function(string): void} reportError - report error message
 * @property {function(string): void} reportInformation - report information message
 * @property {function(string): void} reportRunningSequence - report a new running sequence
 * @property {function(string): void} reportSucceededSequence - report a successful execution of a sequence
 * @property {function(string): void} reportSucceededProcess - report a successful execution of a process
 * @property {function(string): function(boolean):void} reportRunningTask - report a task that is executing and may take some time,
 * @property {function(string): void} reportStep - report step message
 * @property {function(string): void} reportSuccess - report success message
 * @property {function(string, string): string} formatAsElegantPath - report a successful execution of a sequence
 */
