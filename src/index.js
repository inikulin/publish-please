'use strict';

const getNpmArgs = require('./utils/get-npm-args');

module.exports = function() {
    if (process.argv.indexOf('guard') > -1) {
        return require('./guard');
    }

    if (process.argv.indexOf('config') > -1) {
        const config = require('./config');
        return config.configurePublishPlease.inCurrentProject();
    }

    const npmArgs = getNpmArgs(process.env);
    if (npmArgs && npmArgs['--dry-run']) {
        return require('./publish/dry-run-workflow')();
    }

    return require('./publish/publish-workflow')();
};
