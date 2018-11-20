'use strict';

const pathSeparator = require('path').sep;
const spawn = require('cp-sugar').spawn;
const reporter = require('../reporters/current');

/* eslint-disable indent */
module.exports = function publish(publishCommand, publishTag) {
    const command = `${publishCommand} --tag ${publishTag} --with-publish-please`;
    const projectName = process
        .cwd()
        .split(pathSeparator)
        .pop();
    return spawn(command)
        .then((res) => {
            publishCommand.includes(' npm publish')
                ? reporter
                      .current()
                      .reportSucceededProcess(
                          `${projectName} has been successfully published.`
                      )
                : reporter
                      .current()
                      .reportSucceededProcess(
                          `${projectName} is safe to be published.`
                      );
            return res || true;
        })
        .then(() => command);
};
