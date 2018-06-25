'use strict';

const getNpmArgs = require('./utils/get-npm-args');

module.exports = function() {
    if (process.argv.indexOf('guard') > -1) {
        return require('./guard')(process.env);
    }
    const npmArgs = getNpmArgs(process.env);
    if (npmArgs && npmArgs['config']) {
        const config = require('./config');
        return config.configurePublishPlease.inCurrentProject();
    }

    if (npmArgs && npmArgs['--dry-run']) {
        return require('./publish/dry-run-workflow')();
    }

    return require('./publish/publish-workflow')();
};
