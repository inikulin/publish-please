'use strict';

module.exports.isCI = function() {
    return require('is-ci') === true;
};
