'use strict';
const exec = require('cp-sugar').exec;
const reporter = require('../reporters/current');

module.exports = function printReleaseInfo(pkgVersion, publishTag) {
    let commitInfo = null;

    return exec('git log -1 --oneline')
        .then((info) => {
            commitInfo = info;

            return exec('npm whoami --silent');
        })
        .catch(() => reporter.current().reportError('<not logged in>'))
        .then((publisher) => {
            // prettier-ignore
            reporter.current().reportRunningSequence('Release info');
            // prettier-ignore
            reporter.current().reportAsIs(`  Version:       ${pkgVersion}`);
            // prettier-ignore
            reporter.current().reportAsIs(`  Latest commit: ${commitInfo}`);
            // prettier-ignore
            reporter.current().reportAsIs(`  Publish tag:   ${publishTag}`);
            // prettier-ignore
            reporter.current().reportAsIs(`  Publisher:     ${publisher}`);
        });
};
