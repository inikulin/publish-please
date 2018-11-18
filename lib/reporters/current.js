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
