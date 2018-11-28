'use strict';

module.exports.isCI = function() {
    return require('is-ci') === true;
};

module.exports.isTeamcity = function() {
    return 'TEAMCITY_VERSION' in process.env;
};
