'use strict';
const spawn = require('cp-sugar').spawn;
const reporter = require('../reporters/current');

module.exports = function runScript(command, scriptType) {
    reporter
        .current()
        .reportRunningSequence(
            `Running ${scriptType ? scriptType : ''} script`
        );

    return spawn(command).then(() => {
        reporter
            .current()
            .reportSucceededSequence(
                `${scriptType ? scriptType : ''} script passed`
            );
    });
};

module.exports.SCRIPT_TYPE = {
    prePublish: 'pre-publish',
    postPublish: 'post-publish',
};
