'use strict';

const reporter = require('./reporters/current');
const getNpmArgs = require('./utils/get-npm-args');
const ERROR_MESSAGE = `
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!! 'npm publish' is forbidden for this package. !!
!! Use 'npm run publish-please' instead.        !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
`;

function reportError() {
    reporter.current().reportError(ERROR_MESSAGE);
}

module.exports = function(processEnv) {
    const npmArgs = getNpmArgs(processEnv);

    if (npmArgs && npmArgs.publish && !npmArgs['--with-publish-please']) {
        reportError();
        process.exit(1);
        return;
    }

    process.exit(0);
};
