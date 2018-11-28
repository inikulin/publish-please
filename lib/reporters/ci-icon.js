'use strict';

const os = require('os');

module.exports.success = function() {
    const isTeamcity = require('./env-type').isTeamcity();
    const platform = os.platform();
    if (isTeamcity) {
        return '[v]';
    }
    if (platform.startsWith('win')) {
        return '√';
    }
    return '✓';
};

module.exports.error = function() {
    const isTeamcity = require('./env-type').isTeamcity();
    const platform = os.platform();
    if (isTeamcity) {
        return '[x]';
    }
    if (platform.startsWith('win')) {
        return '×';
    }
    return '✖';
};
