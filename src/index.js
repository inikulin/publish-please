'use strict';

const getNpmArgs = require('./utils/get-npm-args');
const getNpxArgs = require('./utils/get-npx-args');

module.exports = function() {
    if (process.argv.indexOf('guard') > -1) {
        return require('./guard')(process.env);
    }

    if (shouldRunConfigurationWizard()) {
        const config = require('./config');
        return config.configurePublishPlease.inCurrentProject();
    }

    if (shouldRunInDryMode()) {
        return require('./publish/dry-run-workflow')();
    }

    return require('./publish/publish-workflow')();
};

function shouldRunInDryMode() {
    const npmArgs = getNpmArgs(process.env);
    if (npmArgs && npmArgs['--dry-run']) {
        return true;
    }

    const npxArgs = getNpxArgs(process);
    if (npxArgs && npxArgs['--dry-run']) {
        return true;
    }

    return false;
}

function shouldRunConfigurationWizard() {
    const npmArgs = getNpmArgs(process.env);
    if (npmArgs && npmArgs['config']) {
        return true;
    }

    const npxArgs = getNpxArgs(process);
    if (npxArgs && npxArgs['config']) {
        return true;
    }
    return false;
}
