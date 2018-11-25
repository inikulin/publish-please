'use strict';
const reporter = require('../reporters/current');
/**
 * Show validation errors.
 * @module utils/show-validation-errors
 * @param {Error} err - Error object
 */
module.exports = function showValidationErrors(err) {
    reporter.current().reportAsIs('');
    reporter.current().reportError('ERRORS');
    reporter.current().reportAsIs(err.message);
    reporter.current().reportAsIs('');
};
